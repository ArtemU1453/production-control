import {
  CuttingRollKind,
  CuttingSessionStatus,
  JumboOperationType,
  JumboStatus,
  RollDestination,
  type CuttingOrderInput,
  type CuttingRoll,
  type CuttingSession,
  type Jumbo,
  type JumboOperation,
  type OrderInfo,
} from "../models";
import type {
  CuttingSessionRepository,
  JumboOperationRepository,
  JumboRepository,
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
  operationsFor(jumboId: string): Promise<JumboOperation[]>;
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
  if (result.additional_width_mm && result.total_additional_rolls > 0) {
    rolls.push({
      id: makeId(),
      sessionId,
      kind: CuttingRollKind.additional,
      widthMm: result.additional_width_mm,
      lengthM: result.roll_length_m,
      count: result.total_additional_rolls,
      destination: additionalDestination,
    });
  }
  return rolls;
}

export function createWarehouseService(
  jumbos: JumboRepository,
  operations: JumboOperationRepository,
  sessions: CuttingSessionRepository,
): WarehouseService {
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
        const becameWriteOff = remainderAfterM < LOW_REMAINDER_THRESHOLD_M;
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
          currentRemainderM < LOW_REMAINDER_THRESHOLD_M
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

    async operationsFor(jumboId) {
      return operations.forJumbo(jumboId);
    },
  };
}
