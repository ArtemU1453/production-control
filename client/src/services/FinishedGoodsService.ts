import {
  FinishedRollStatus,
  Machine,
  RollDestination,
  type Coating,
  type FinishedRoll,
  type FinishedRollHistoryEntry,
} from "../models";
import type { FinishedRollRepository } from "../repositories";
import { nowIso } from "../extensions/date";
import { makeId } from "../utilities/id";

/** Good rolls attributed to one Jumbo of a (possibly multi-Jumbo) order. */
export interface FinishedGoodsJumboShare {
  jumboStockNumber: string;
  /** Number of GOOD rolls this Jumbo contributed (defects already removed). */
  goodRolls: number;
}

/** Everything needed to materialize a completed order's good product into the
 *  finished-goods warehouse. Defects are never passed here. */
export interface FinishedGoodsCompletionInput {
  orderNumber: string;
  materialId: string;
  materialCode: string;
  widthMm: number;
  lengthM: number;
  machine: Machine;
  operator: string;
  /** Красящий слой (IN/OUT) of the order. */
  coating?: Coating;
  /** Manufacturing / completion timestamp (ISO). */
  producedAt: string;
  /** Rolls needed to close the order (good product target). */
  targetRolls: number;
  /**
   * Overall destination chosen during production. `warehouse` means every good
   * roll goes straight to finished-goods stock; `order` means the order is
   * closed first (up to `targetRolls`) and only the surplus goes to stock.
   */
  destination: RollDestination;
  /** Good rolls per Jumbo, in production order. */
  perJumbo: FinishedGoodsJumboShare[];
  /**
   * Additional-size rolls to stock, aggregated per width. These are byproducts
   * of the cut (not part of the main order), booked as their own finished units
   * so sizes never mix. Empty when the additional rolls are delivered with the
   * order rather than stocked.
   */
  additionalSizes?: { widthMm: number; count: number }[];
  sessionId?: string;
  /** Order chain id — also used as the idempotency key when present. */
  chainId?: string;
}

/**
 * Finished-goods warehouse service.
 *
 * Owns the lifecycle of every finished roll: automatic arrival when a
 * production run completes (order rolls vs. warehouse surplus), reservation and
 * shipping, and the movement history. It is an additive, self-contained ledger
 * — it does not touch the material warehouse, the calculation engine, the Jumbo
 * write-off, reports or history.
 */
export interface FinishedGoodsService {
  list(): Promise<FinishedRoll[]>;
  getById(id: string): Promise<FinishedRoll | undefined>;
  /** Creates one finished roll per good roll of a completed order. Idempotent
   *  per `chainId`/`sessionId`: a repeated call for the same completion is a
   *  no-op and returns the already-stored rolls. */
  materializeFromCompletion(input: FinishedGoodsCompletionInput): Promise<FinishedRoll[]>;
  /** Reserves a roll (На складе → Зарезервирован). */
  reserve(id: string, operator?: string): Promise<FinishedRoll | undefined>;
  /** Releases a reservation (Зарезервирован → На складе). */
  releaseReservation(id: string, operator?: string): Promise<FinishedRoll | undefined>;
  /** Ships a roll (→ Отгружен). The record stays in history. */
  ship(id: string, operator?: string): Promise<FinishedRoll | undefined>;
  /** Writes a roll off (→ Списан). The record stays in history, never deleted. */
  writeOff(id: string, operator?: string, note?: string): Promise<FinishedRoll | undefined>;
  /** Moves a roll to a storage location (records a «Перемещён» history entry). */
  relocate(id: string, location: string, operator?: string): Promise<FinishedRoll | undefined>;
  /** Edits the roll's comment (records an «Изменён» history entry). */
  updateComment(id: string, comment: string, operator?: string): Promise<FinishedRoll | undefined>;
  /** Manually creates a finished-goods record (Добавить рулон). */
  create(input: ManualFinishedRollInput): Promise<FinishedRoll>;
  /** Deletes finished-goods records by id (used to remove an aggregated row). */
  remove(ids: string[]): Promise<void>;
}

/** Payload for a manual finished-goods entry. */
export interface ManualFinishedRollInput {
  materialId: string;
  materialCode: string;
  widthMm: number;
  lengthM: number;
  count: number;
  coating: Coating;
  comment?: string;
  /** Дата поступления (ISO); defaults to now. */
  producedAt?: string;
  operator?: string;
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, "0");
}

/** Builds a human-readable roll number «РЛ-YYMMDD-NNNN». */
function rollNumber(producedAt: string, sequence: number): string {
  const date = new Date(producedAt);
  const stamp = Number.isNaN(date.getTime())
    ? "000000"
    : `${date.getFullYear().toString().slice(2)}${pad(date.getMonth() + 1, 2)}${pad(date.getDate(), 2)}`;
  return `РЛ-${stamp}-${pad(sequence, 4)}`;
}

function historyEntry(
  status: FinishedRollStatus,
  title: string,
  at: string,
  operator?: string,
): FinishedRollHistoryEntry {
  return { id: makeId(), at, status, title, operator: operator || undefined };
}

export function createFinishedGoodsService(
  finishedRolls: FinishedRollRepository,
): FinishedGoodsService {
  async function nextSequenceBase(): Promise<number> {
    return (await finishedRolls.getAll()).length;
  }

  async function transition(
    id: string,
    next: FinishedRollStatus,
    title: string,
    operator: string | undefined,
    guard: (roll: FinishedRoll) => boolean,
  ): Promise<FinishedRoll | undefined> {
    const roll = await finishedRolls.getById(id);
    if (!roll || !guard(roll)) {
      return undefined;
    }
    const at = nowIso();
    const updated: FinishedRoll = {
      ...roll,
      status: next,
      updatedAt: at,
      history: [...roll.history, historyEntry(next, title, at, operator ?? roll.operator)],
    };
    await finishedRolls.save(updated);
    return updated;
  }

  return {
    async list() {
      return finishedRolls.getAll();
    },

    async getById(id) {
      return finishedRolls.getById(id);
    },

    async materializeFromCompletion(input) {
      // Idempotency: never double-book the same completion.
      const key = input.chainId ?? input.sessionId;
      if (key) {
        const existing = (await finishedRolls.getAll()).filter(
          (roll) => (roll.chainId ?? roll.sessionId) === key && roll.orderNumber === input.orderNumber,
        );
        if (existing.length > 0) {
          return existing;
        }
      }

      // Flatten good rolls into individual units, preserving Jumbo attribution.
      const units: string[] = [];
      for (const share of input.perJumbo) {
        const count = Math.max(0, Math.round(share.goodRolls));
        for (let i = 0; i < count; i += 1) {
          units.push(share.jumboStockNumber);
        }
      }
      const additionalTotal = (input.additionalSizes ?? []).reduce((s, x) => s + Math.max(0, Math.round(x.count)), 0);
      if (units.length === 0 && additionalTotal === 0) {
        return [];
      }

      // Only SURPLUS beyond the order reaches the finished-goods warehouse.
      // The first `target` good rolls close the order and are delivered to the
      // customer — they are NOT stocked. Only the surplus (goodProduced − target)
      // is booked. Defects never reach here (perJumbo already excludes them).
      const target = Math.max(0, Math.round(input.targetRolls));
      const now = nowIso();
      const base = await nextSequenceBase();
      const created: FinishedRoll[] = [];

      units.forEach((jumboStockNumber, index) => {
        // Rolls that fulfil the order are delivered to the customer, not stocked.
        if (index < target) {
          return;
        }
        const sourceReason = "Излишек производства";
        const roll: FinishedRoll = {
          id: makeId(),
          number: rollNumber(input.producedAt, base + created.length + 1),
          orderNumber: input.orderNumber,
          materialId: input.materialId,
          materialCode: input.materialCode,
          widthMm: input.widthMm,
          lengthM: input.lengthM,
          count: 1,
          producedAt: input.producedAt,
          machine: input.machine,
          operator: input.operator,
          coating: input.coating,
          sourceReason,
          jumboStockNumber,
          status: FinishedRollStatus.inStock,
          sessionId: input.sessionId,
          chainId: input.chainId,
          history: [
            historyEntry(FinishedRollStatus.inStock, "Изготовлен", input.producedAt, input.operator),
            historyEntry(FinishedRollStatus.inStock, "Поступил на склад", now, input.operator),
          ],
          createdAt: now,
          updatedAt: now,
        };
        created.push(roll);
      });

      // Additional-size rolls (byproducts of the cut) are stocked as their own
      // finished units — one record per roll, per size, so sizes never mix.
      for (const size of input.additionalSizes ?? []) {
        const count = Math.max(0, Math.round(size.count));
        for (let i = 0; i < count; i += 1) {
          created.push({
            id: makeId(),
            number: rollNumber(input.producedAt, base + created.length + 1),
            orderNumber: input.orderNumber,
            materialId: input.materialId,
            materialCode: input.materialCode,
            widthMm: size.widthMm,
            lengthM: input.lengthM,
            count: 1,
            producedAt: input.producedAt,
            machine: input.machine,
            operator: input.operator,
            coating: input.coating,
            sourceReason: "Доп. размер (излишек)",
            jumboStockNumber: input.perJumbo[0]?.jumboStockNumber ?? "",
            status: FinishedRollStatus.inStock,
            sessionId: input.sessionId,
            chainId: input.chainId,
            history: [
              historyEntry(FinishedRollStatus.inStock, "Изготовлен", input.producedAt, input.operator),
              historyEntry(FinishedRollStatus.inStock, "Поступил на склад", now, input.operator),
            ],
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      if (created.length === 0) {
        return [];
      }

      // Persist newest-first so the freshest order appears at the top.
      for (let i = created.length - 1; i >= 0; i -= 1) {
        await finishedRolls.save(created[i]);
      }
      return created;
    },

    async reserve(id, operator) {
      return transition(
        id,
        FinishedRollStatus.reserved,
        "Зарезервирован",
        operator,
        (roll) => roll.status === FinishedRollStatus.inStock || roll.status === FinishedRollStatus.inOrder,
      );
    },

    async releaseReservation(id, operator) {
      return transition(
        id,
        FinishedRollStatus.inStock,
        "Снят резерв",
        operator,
        (roll) => roll.status === FinishedRollStatus.reserved,
      );
    },

    async ship(id, operator) {
      return transition(
        id,
        FinishedRollStatus.shipped,
        "Отгружен",
        operator,
        (roll) => roll.status !== FinishedRollStatus.shipped,
      );
    },

    async writeOff(id, operator, note) {
      const roll = await finishedRolls.getById(id);
      if (!roll || roll.status === FinishedRollStatus.writtenOff) {
        return undefined;
      }
      const at = nowIso();
      const updated: FinishedRoll = {
        ...roll,
        status: FinishedRollStatus.writtenOff,
        updatedAt: at,
        history: [
          ...roll.history,
          { id: makeId(), at, status: FinishedRollStatus.writtenOff, title: "Списан", operator: (operator || roll.operator) || undefined, note: note || undefined },
        ],
      };
      await finishedRolls.save(updated);
      return updated;
    },

    async relocate(id, location, operator) {
      const roll = await finishedRolls.getById(id);
      if (!roll) {
        return undefined;
      }
      const at = nowIso();
      const updated: FinishedRoll = {
        ...roll,
        storageLocation: location || undefined,
        updatedAt: at,
        history: [
          ...roll.history,
          { id: makeId(), at, status: roll.status, title: location ? `Перемещён → ${location}` : "Перемещён", operator: (operator || roll.operator) || undefined },
        ],
      };
      await finishedRolls.save(updated);
      return updated;
    },

    async updateComment(id, comment, operator) {
      const roll = await finishedRolls.getById(id);
      if (!roll) {
        return undefined;
      }
      const at = nowIso();
      const updated: FinishedRoll = {
        ...roll,
        comment: comment || undefined,
        updatedAt: at,
        history: [
          ...roll.history,
          { id: makeId(), at, status: roll.status, title: "Изменён комментарий", operator: (operator || roll.operator) || undefined },
        ],
      };
      await finishedRolls.save(updated);
      return updated;
    },

    async create(input) {
      const now = nowIso();
      const producedAt = input.producedAt || now;
      const base = await nextSequenceBase();
      const count = Math.max(1, Math.round(input.count));
      const roll: FinishedRoll = {
        id: makeId(),
        number: rollNumber(producedAt, base + 1),
        orderNumber: "",
        materialId: input.materialId,
        materialCode: input.materialCode,
        widthMm: input.widthMm,
        lengthM: input.lengthM,
        count,
        producedAt,
        machine: Machine.machine1,
        operator: input.operator ?? "",
        coating: input.coating,
        sourceReason: "Ручное добавление",
        jumboStockNumber: "",
        status: FinishedRollStatus.inStock,
        comment: input.comment || "Ручное добавление",
        history: [
          { id: makeId(), at: producedAt, status: FinishedRollStatus.inStock, title: "Создан вручную", operator: input.operator || undefined },
        ],
        createdAt: now,
        updatedAt: now,
      };
      await finishedRolls.save(roll);
      return roll;
    },

    async remove(ids) {
      for (const id of ids) {
        await finishedRolls.delete(id);
      }
    },
  };
}
