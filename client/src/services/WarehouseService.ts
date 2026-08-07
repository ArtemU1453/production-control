import {
  CuttingRollKind,
  CuttingSessionStatus,
  JumboOperationType,
  JumboStatus,
  RollDestination,
  WasteKind,
  type ArchivedJumbo,
  type ArchivedJumboStatistics,
  type CuttingOrderInput,
  type CuttingRoll,
  type CuttingSession,
  type Jumbo,
  type JumboOperation,
  type OrderInfo,
  type Waste,
} from "../models";
import type {
  ArchivedJumboRepository,
  CuttingSessionRepository,
  JumboOperationRepository,
  JumboRepository,
  SettingsRepository,
  WasteRepository,
} from "../repositories";
import type { CalcResult } from "../core/calculator/calculatorLogic";
import { nowIso } from "../extensions/date";
import { makeId } from "../utilities/id";

/** Remainder (m) below which a Jumbo is automatically marked for write-off. */
export const LOW_REMAINDER_THRESHOLD_M = 300;

/** One line item in a receipt batch. */
export interface JumboReceiptItem {
  stockNumber: string;
  widthMm: number;
  initialWindingM: number;
  comment?: string;
}

export interface ReceiptBatch {
  materialId: string;
  materialCode: string;
  arrivalDate: string;
  operator?: string;
  items: JumboReceiptItem[];
}

export interface CompleteCalculationParams {
  jumboId: string;
  order: OrderInfo;
  input: CuttingOrderInput;
  result: CalcResult;
  /** Destination chosen for the additional rolls. */
  additionalDestination: RollDestination;
}

export interface CompleteCalculationOutcome {
  jumbo: Jumbo;
  session: CuttingSession;
  /** Identifier of the atomic transaction; can be passed to `rollbackTransaction`. */
  transactionId: string;
  /** The Jumbo was used for the first time by this calculation. */
  firstUse: boolean;
  /** The Jumbo crossed the low-remainder threshold and was marked for write-off. */
  becameWriteOff: boolean;
  remainderAfterM: number;
}

export interface CloseJumboParams {
  jumboId: string;
  operator?: string;
  comment?: string;
}

export interface CloseJumboOutcome {
  archived: ArchivedJumbo;
  waste: Waste;
}

/** Read-only summary shown before closing a Jumbo. */
export interface JumboCloseSummary {
  stockNumber: string;
  materialCode: string;
  initialWindingM: number;
  currentRemainderM: number;
  usedLength: number;
  usefulArea: number;
  ordersCount: number;
  rollsCount: number;
}

export function summarizeForClose(jumbo: Jumbo): JumboCloseSummary {
  return {
    stockNumber: jumbo.stockNumber,
    materialCode: jumbo.materialCode,
    initialWindingM: jumbo.initialWindingM,
    currentRemainderM: jumbo.currentRemainderM,
    usedLength: jumbo.usedLength,
    usefulArea: jumbo.usefulArea,
    ordersCount: jumbo.ordersCount,
    rollsCount: jumbo.rollsCount,
  };
}

/**
 * Coordinates warehouse write operations and their journal entries.
 *
 * Every mutation records a {@link JumboOperation} automatically, and the Jumbo's
 * accumulative fields are written to the record — never recomputed from history.
 * `completeCalculation` runs as one atomic transaction (partial writes are
 * undone on error); `rollbackTransaction` reverses a committed transaction while
 * keeping the journal immutable.
 */
export interface WarehouseService {
  receiveBatch(batch: ReceiptBatch): Promise<Jumbo[]>;
  startUsage(jumboId: string, operator?: string): Promise<Jumbo | undefined>;
  updateJumbo(
    jumbo: Jumbo,
    options?: { operator?: string; type?: JumboOperationType; comment?: string },
  ): Promise<Jumbo>;
  completeCalculation(
    params: CompleteCalculationParams,
  ): Promise<CompleteCalculationOutcome | undefined>;
  /** Reverses a committed transaction: restores the Jumbo accumulators and marks
   *  the operations and session as reverted without deleting any records. */
  rollbackTransaction(transactionId: string): Promise<boolean>;
  /** Closes a Jumbo: books the remainder as technological scrap, freezes final
   *  statistics, records an Archive operation and creates the ArchivedJumbo. */
  closeJumbo(params: CloseJumboParams): Promise<CloseJumboOutcome | undefined>;
  operationsFor(jumboId: string): Promise<JumboOperation[]>;
  /** Removes a production session and its operations, restoring the source
   *  Jumbo's accumulators and remainder so the warehouse, reports and KPI stay
   *  consistent. A no-op for an unknown session; the Jumbo is left untouched
   *  when it has already been archived (its snapshot is frozen). */
  deleteSession(sessionId: string): Promise<boolean>;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function zeroedAccumulators(): Pick<
  Jumbo,
  "usedLength" | "usefulArea" | "wasteArea" | "scrapArea" | "efficiency" | "ordersCount" | "rollsCount"
> {
  return {
    usedLength: 0,
    usefulArea: 0,
    wasteArea: 0,
    scrapArea: 0,
    efficiency: 0,
    ordersCount: 0,
    rollsCount: 0,
  };
}

/** Cumulative utilization = useful area / total processed area. Computed from
 *  the stored accumulators only, never by replaying history. */
function computeEfficiency(usefulAreaM2: number, usedLengthM: number, widthMm: number): number {
  const totalAreaM2 = usedLengthM * (widthMm / 1000);
  return totalAreaM2 > 0 ? usefulAreaM2 / totalAreaM2 : 0;
}

function buildRolls(sessionId: string, result: CalcResult, additionalDestination: RollDestination): CuttingRoll[] {
  const rolls: CuttingRoll[] = [
    {
      id: makeId(),
      sessionId,
      kind: CuttingRollKind.main,
      widthMm: result.roll_width_mm,
      lengthM: result.roll_length_m,
      count: result.total_main_rolls,
      destination: RollDestination.order,
    },
  ];
  // Each additional size is tracked as its own roll record so sizes never mix.
  if (result.additional_width_mm && result.total_additional_rolls_1 > 0) {
    rolls.push({
      id: makeId(),
      sessionId,
      kind: CuttingRollKind.additional,
      widthMm: result.additional_width_mm,
      lengthM: result.roll_length_m,
      count: result.total_additional_rolls_1,
      destination: additionalDestination,
    });
  }
  if (result.additional_width_mm_2 && result.total_additional_rolls_2 > 0) {
    rolls.push({
      id: makeId(),
      sessionId,
      kind: CuttingRollKind.additional,
      widthMm: result.additional_width_mm_2,
      lengthM: result.roll_length_m,
      count: result.total_additional_rolls_2,
      destination: additionalDestination,
    });
  }
  return rolls;
}

export function createWarehouseService(
  jumbos: JumboRepository,
  operations: JumboOperationRepository,
  sessions: CuttingSessionRepository,
  wastes: WasteRepository,
  archived: ArchivedJumboRepository,
  settings?: SettingsRepository,
): WarehouseService {
  /** Write-off threshold: the operator-configured value from Settings, falling
   *  back to the default when Settings are unavailable. */
  async function writeOffThresholdM(): Promise<number> {
    if (!settings) {
      return LOW_REMAINDER_THRESHOLD_M;
    }
    const value = (await settings.load()).jumboThresholdM;
    return typeof value === "number" && value >= 0 ? value : LOW_REMAINDER_THRESHOLD_M;
  }

  async function saveOperation(
    operation: Omit<JumboOperation, "id" | "timestamp" | "createdAt" | "updatedAt" | "isReverted"> & {
      timestamp?: string;
    },
  ): Promise<JumboOperation> {
    const now = nowIso();
    const saved: JumboOperation = {
      ...operation,
      id: makeId(),
      timestamp: operation.timestamp ?? now,
      createdAt: now,
      updatedAt: now,
      isReverted: false,
    };
    await operations.save(saved);
    return saved;
  }

  return {
    async receiveBatch(batch) {
      const created: Jumbo[] = [];
      for (const item of batch.items) {
        const jumbo: Jumbo = {
          id: makeId(),
          stockNumber: item.stockNumber,
          materialId: batch.materialId,
          materialCode: batch.materialCode,
          widthMm: item.widthMm,
          initialWindingM: item.initialWindingM,
          currentRemainderM: item.initialWindingM,
          arrivalDate: batch.arrivalDate,
          status: JumboStatus.onStock,
          comment: item.comment,
          ...zeroedAccumulators(),
        };
        await jumbos.save(jumbo);
        await saveOperation({
          jumboId: jumbo.id,
          type: JumboOperationType.receipt,
          operator: batch.operator,
          comment: "Приход партии",
        });
        created.push(jumbo);
      }
      return created;
    },

    async startUsage(jumboId, operator) {
      const jumbo = await jumbos.getById(jumboId);
      if (!jumbo) {
        return undefined;
      }
      const updated: Jumbo = {
        ...jumbo,
        status: JumboStatus.inWork,
        usageStartDate: jumbo.usageStartDate ?? nowIso(),
      };
      await jumbos.save(updated);
      await saveOperation({
        jumboId,
        type: JumboOperationType.usageStart,
        operator,
      });
      return updated;
    },

    async updateJumbo(jumbo, options) {
      await jumbos.save(jumbo);
      await saveOperation({
        jumboId: jumbo.id,
        type: options?.type ?? JumboOperationType.edit,
        operator: options?.operator,
        comment: options?.comment,
      });
      return jumbo;
    },

    async completeCalculation(params) {
      const jumbo = await jumbos.getById(params.jumboId);
      if (!jumbo) {
        return undefined;
      }

      const { order, input, result } = params;
      const timestamp = nowIso();
      const transactionId = makeId();
      const sessionId = makeId();

      // Snapshot for rollback if any write in the transaction fails.
      const snapshot: Jumbo = { ...jumbo };
      const createdOperationIds: string[] = [];
      let sessionPersisted = false;

      try {
        const firstUse = jumbo.status === JumboStatus.onStock;
        const usageStartDate = jumbo.usageStartDate ?? (firstUse ? timestamp : undefined);
        const operationIds: string[] = [];

        if (firstUse) {
          const startOp = await saveOperation({
            jumboId: jumbo.id,
            type: JumboOperationType.usageStart,
            timestamp,
            transactionId,
            sessionId,
            operator: order.operator,
          });
          createdOperationIds.push(startOp.id);
          operationIds.push(startOp.id);
        }

        const remainderAfterM = Math.max(0, result.remaining_jumbo_m);
        const consumed = Math.max(0, jumbo.currentRemainderM - remainderAfterM);
        const usedLength = jumbo.usedLength + consumed;
        const usefulArea = jumbo.usefulArea + result.useful_area_m2;
        const rollsCount = jumbo.rollsCount + result.total_rolls;
        const ordersCount = jumbo.ordersCount + 1;
        const efficiency = computeEfficiency(usefulArea, usedLength, jumbo.widthMm);
        const becameWriteOff = remainderAfterM < (await writeOffThresholdM());
        const status = becameWriteOff ? JumboStatus.toWriteOff : JumboStatus.inWork;

        const calcOp = await saveOperation({
          jumboId: jumbo.id,
          type: JumboOperationType.calculation,
          timestamp,
          transactionId,
          sessionId,
          operator: order.operator,
          machine: order.machine,
          customer: order.customer,
          orderNumber: order.orderNumber,
          usedLengthDeltaM: consumed,
          usefulAreaDeltaM2: result.useful_area_m2,
          rollsCount: result.total_rolls,
          remainderAfterM,
        });
        createdOperationIds.push(calcOp.id);
        operationIds.push(calcOp.id);

        const updatedJumbo: Jumbo = {
          ...jumbo,
          currentRemainderM: remainderAfterM,
          usedLength,
          usefulArea,
          rollsCount,
          ordersCount,
          efficiency,
          status,
          usageStartDate,
        };
        await jumbos.save(updatedJumbo);

        const session: CuttingSession = {
          id: sessionId,
          transactionId,
          version: 1,
          status: CuttingSessionStatus.active,
          createdAt: timestamp,
          updatedAt: timestamp,
          order,
          jumboId: jumbo.id,
          jumboStockNumber: jumbo.stockNumber,
          materialCode: jumbo.materialCode,
          input,
          result,
          rolls: buildRolls(sessionId, result, params.additionalDestination),
          operationIds,
          wasteIds: [],
          comment: order.comment,
        };
        await sessions.save(session);
        sessionPersisted = true;

        return { jumbo: updatedJumbo, session, transactionId, firstUse, becameWriteOff, remainderAfterM };
      } catch (error) {
        // Undo partial writes so the store stays consistent.
        await jumbos.save(snapshot);
        for (const id of createdOperationIds) {
          await operations.delete(id);
        }
        if (sessionPersisted) {
          await sessions.delete(sessionId);
        }
        throw error;
      }
    },

    async rollbackTransaction(transactionId) {
      const txnOperations = (await operations.getAll()).filter(
        (operation) => operation.transactionId === transactionId && !operation.isReverted,
      );
      const calcOp = txnOperations.find(
        (operation) => operation.type === JumboOperationType.calculation,
      );
      if (!calcOp) {
        return false;
      }

      const jumbo = await jumbos.getById(calcOp.jumboId);
      if (jumbo) {
        const consumed = calcOp.usedLengthDeltaM ?? 0;
        const usedLength = Math.max(0, jumbo.usedLength - consumed);
        const usefulArea = Math.max(0, jumbo.usefulArea - (calcOp.usefulAreaDeltaM2 ?? 0));
        const rollsCount = Math.max(0, jumbo.rollsCount - (calcOp.rollsCount ?? 0));
        const ordersCount = Math.max(0, jumbo.ordersCount - 1);
        const currentRemainderM = jumbo.currentRemainderM + consumed;
        const efficiency = computeEfficiency(usefulArea, usedLength, jumbo.widthMm);
        const status =
          currentRemainderM < (await writeOffThresholdM())
            ? JumboStatus.toWriteOff
            : JumboStatus.inWork;
        await jumbos.save({
          ...jumbo,
          usedLength,
          usefulArea,
          rollsCount,
          ordersCount,
          currentRemainderM,
          efficiency,
          status,
        });
      }

      const now = nowIso();
      for (const operation of txnOperations) {
        await operations.save({ ...operation, isReverted: true, updatedAt: now });
      }
      const session = (await sessions.getAll()).find((s) => s.transactionId === transactionId);
      if (session) {
        await sessions.save({ ...session, status: CuttingSessionStatus.reverted, updatedAt: now });
      }
      return true;
    },

    async closeJumbo({ jumboId, operator, comment }) {
      const jumbo = await jumbos.getById(jumboId);
      if (!jumbo || jumbo.status === JumboStatus.archived) {
        return undefined;
      }

      const now = nowIso();
      const widthM = jumbo.widthMm / 1000;
      const remainderM = jumbo.currentRemainderM;

      // The leftover metrage is booked as technological scrap.
      const scrapRemainderAreaM2 = round1(remainderM * widthM);
      const waste: Waste = {
        id: makeId(),
        kind: WasteKind.technological,
        areaM2: scrapRemainderAreaM2,
        widthMm: jumbo.widthMm,
        lengthM: remainderM,
        jumboId: jumbo.id,
        operator,
        comment,
        createdAt: now,
      };

      // Final statistics, computed once and frozen in the archive.
      const totalAreaM2 = round1(jumbo.initialWindingM * widthM);
      const usefulAreaM2 = round1(jumbo.usefulArea);
      const wasteAreaM2 = round1(jumbo.wasteArea);
      const scrapAreaM2 = round1(jumbo.scrapArea + scrapRemainderAreaM2);
      const totalLossesM2 = round1(wasteAreaM2 + scrapAreaM2);
      const percent = (value: number) => (totalAreaM2 > 0 ? round1((value / totalAreaM2) * 100) : 0);

      const closedJumbo: Jumbo = {
        ...jumbo,
        currentRemainderM: 0,
        scrapArea: scrapAreaM2,
        status: JumboStatus.archived,
        usageEndDate: now,
      };

      const snapshot: Jumbo = { ...jumbo };
      let wastePersisted = false;
      let jumboPersisted = false;
      const createdOperationIds: string[] = [];
      let archivePersisted = false;

      try {
        await wastes.save(waste);
        wastePersisted = true;

        await jumbos.save(closedJumbo);
        jumboPersisted = true;

        const archiveOp = await saveOperation({
          jumboId: jumbo.id,
          type: JumboOperationType.archive,
          timestamp: now,
          operator,
          comment: comment ?? "Архивирование",
          remainderAfterM: 0,
        });
        createdOperationIds.push(archiveOp.id);

        const jumboOperations = await operations.forJumbo(jumbo.id);
        const jumboSessions = (await sessions.getAll()).filter((s) => s.jumboId === jumbo.id);
        const jumboWastes = await wastes.forJumbo(jumbo.id);

        const statistics: ArchivedJumboStatistics = {
          totalAreaM2,
          usefulAreaM2,
          wasteAreaM2,
          scrapAreaM2,
          totalLossesM2,
          usefulPercent: percent(usefulAreaM2),
          wastePercent: percent(wasteAreaM2),
          scrapPercent: percent(scrapAreaM2),
          usedLengthM: round1(jumbo.usedLength),
          initialWindingM: jumbo.initialWindingM,
          finalRemainderM: 0,
          ordersCount: jumbo.ordersCount,
          rollsCount: jumbo.rollsCount,
          operationsCount: jumboOperations.length,
          efficiency: jumbo.efficiency,
        };

        const archivedJumbo: ArchivedJumbo = {
          id: jumbo.id,
          jumbo: closedJumbo,
          operations: jumboOperations,
          sessions: jumboSessions,
          wastes: jumboWastes,
          statistics,
          usageStartDate: jumbo.usageStartDate,
          usageEndDate: now,
          archivedAt: now,
          archivedBy: operator,
          comment,
        };
        await archived.save(archivedJumbo);
        archivePersisted = true;

        return { archived: archivedJumbo, waste };
      } catch (error) {
        // Undo partial writes to keep the store consistent.
        if (jumboPersisted) {
          await jumbos.save(snapshot);
        }
        if (wastePersisted) {
          await wastes.delete(waste.id);
        }
        for (const id of createdOperationIds) {
          await operations.delete(id);
        }
        if (archivePersisted) {
          await archived.delete(jumbo.id);
        }
        throw error;
      }
    },

    async operationsFor(jumboId) {
      return operations.forJumbo(jumboId);
    },

    async deleteSession(sessionId) {
      const session = (await sessions.getAll()).find((s) => s.id === sessionId);
      if (!session) {
        return false;
      }

      const sessionOperations = (await operations.getAll()).filter(
        (operation) => operation.sessionId === sessionId,
      );

      // Restore the source Jumbo's accumulators, unless it has been archived
      // (an archived Jumbo is a frozen snapshot and must not be mutated).
      const jumbo = await jumbos.getById(session.jumboId);
      if (jumbo && jumbo.status !== JumboStatus.archived) {
        const calcOp = sessionOperations.find(
          (operation) => operation.type === JumboOperationType.calculation,
        );
        const consumed = calcOp?.usedLengthDeltaM ?? 0;
        const usedLength = Math.max(0, jumbo.usedLength - consumed);
        const usefulArea = Math.max(0, jumbo.usefulArea - (calcOp?.usefulAreaDeltaM2 ?? 0));
        const rollsCount = Math.max(0, jumbo.rollsCount - (calcOp?.rollsCount ?? 0));
        const ordersCount = Math.max(0, jumbo.ordersCount - 1);
        const currentRemainderM = Math.min(
          jumbo.initialWindingM,
          jumbo.currentRemainderM + consumed,
        );
        const efficiency = computeEfficiency(usefulArea, usedLength, jumbo.widthMm);
        const status =
          currentRemainderM < (await writeOffThresholdM())
            ? JumboStatus.toWriteOff
            : JumboStatus.inWork;
        await jumbos.save({
          ...jumbo,
          usedLength,
          usefulArea,
          rollsCount,
          ordersCount,
          currentRemainderM,
          efficiency,
          status,
        });
      }

      for (const operation of sessionOperations) {
        await operations.delete(operation.id);
      }
      await sessions.delete(sessionId);
      return true;
    },
  };
}
