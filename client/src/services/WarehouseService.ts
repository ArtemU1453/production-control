import {
  CuttingRollKind,
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
 * `completeCalculation` is the production integration point: it applies a plan's
 * effects to the chosen Jumbo incrementally and creates the {@link CuttingSession}.
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
    operation: Omit<JumboOperation, "id" | "timestamp"> & Partial<Pick<JumboOperation, "timestamp">>,
  ): Promise<JumboOperation> {
    const saved: JumboOperation = {
      ...operation,
      id: makeId(),
      timestamp: operation.timestamp ?? nowIso(),
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
      const operationIds: string[] = [];

      const firstUse = jumbo.status === JumboStatus.onStock;
      const usageStartDate = jumbo.usageStartDate ?? (firstUse ? timestamp : undefined);
      if (firstUse) {
        const startOp = await saveOperation({
          jumboId: jumbo.id,
          type: JumboOperationType.usageStart,
          operator: order.operator,
          timestamp,
        });
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

      const sessionId = makeId();

      const calcOp = await saveOperation({
        jumboId: jumbo.id,
        type: JumboOperationType.calculation,
        timestamp,
        operator: order.operator,
        machine: order.machine,
        customer: order.customer,
        orderNumber: order.orderNumber,
        usedLengthDeltaM: consumed,
        usefulAreaDeltaM2: result.useful_area_m2,
        rollsCount: result.total_rolls,
        remainderAfterM,
      });
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
        createdAt: timestamp,
        order,
        jumboId: jumbo.id,
        jumboStockNumber: jumbo.stockNumber,
        materialCode: jumbo.materialCode,
        input,
        result,
        rolls: buildRolls(sessionId, result, params.additionalDestination),
        operationIds,
        wasteIds: [],
      };
      await sessions.save(session);

      return { jumbo: updatedJumbo, session, firstUse, becameWriteOff, remainderAfterM };
    },

    async operationsFor(jumboId) {
      return operations.forJumbo(jumboId);
    },
  };
}
