import {
  FinishedRollStatus,
  RollDestination,
  type FinishedRoll,
  type FinishedRollHistoryEntry,
  type Machine,
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
      if (units.length === 0) {
        return [];
      }

      const allToStock = input.destination === RollDestination.warehouse;
      const now = nowIso();
      const base = await nextSequenceBase();
      const created: FinishedRoll[] = [];

      units.forEach((jumboStockNumber, index) => {
        // With destination «В заказ» the first `targetRolls` close the order and
        // the surplus goes to stock; «На склад» sends everything to stock.
        const goesToOrder = !allToStock && index < input.targetRolls;
        const status = goesToOrder ? FinishedRollStatus.inOrder : FinishedRollStatus.inStock;
        const arrivalTitle = goesToOrder ? "Передан по заказу" : "Поступил на склад";
        const roll: FinishedRoll = {
          id: makeId(),
          number: rollNumber(input.producedAt, base + index + 1),
          orderNumber: input.orderNumber,
          materialId: input.materialId,
          materialCode: input.materialCode,
          widthMm: input.widthMm,
          lengthM: input.lengthM,
          count: 1,
          producedAt: input.producedAt,
          machine: input.machine,
          operator: input.operator,
          jumboStockNumber,
          status,
          sessionId: input.sessionId,
          chainId: input.chainId,
          history: [
            historyEntry(status, "Изготовлен", input.producedAt, input.operator),
            historyEntry(status, arrivalTitle, now, input.operator),
          ],
          createdAt: now,
          updatedAt: now,
        };
        created.push(roll);
      });

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
  };
}
