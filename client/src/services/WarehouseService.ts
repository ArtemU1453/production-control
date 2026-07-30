import {
  JumboOperationType,
  JumboStatus,
  type Jumbo,
  type JumboOperation,
} from "../models";
import type {
  JumboOperationRepository,
  JumboRepository,
} from "../repositories";
import { nowIso } from "../extensions/date";
import { makeId } from "../utilities/id";

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

/**
 * Coordinates warehouse write operations and their journal entries.
 *
 * Every mutation records a {@link JumboOperation} automatically, and the Jumbo's
 * accumulative fields are written to the record — never recomputed from history.
 * On receipt they are initialised to zero; later phases increment them per
 * operation.
 */
export interface WarehouseService {
  receiveBatch(batch: ReceiptBatch): Promise<Jumbo[]>;
  startUsage(jumboId: string, operator?: string): Promise<Jumbo | undefined>;
  updateJumbo(
    jumbo: Jumbo,
    options?: { operator?: string; type?: JumboOperationType; comment?: string },
  ): Promise<Jumbo>;
  operationsFor(jumboId: string): Promise<JumboOperation[]>;
}

function zeroedAccumulators(): Pick<
  Jumbo,
  "usedLength" | "usefulArea" | "wasteArea" | "scrapArea" | "efficiency"
> {
  return { usedLength: 0, usefulArea: 0, wasteArea: 0, scrapArea: 0, efficiency: 0 };
}

export function createWarehouseService(
  jumbos: JumboRepository,
  operations: JumboOperationRepository,
): WarehouseService {
  async function record(
    jumboId: string,
    type: JumboOperationType,
    operator?: string,
    comment?: string,
  ): Promise<void> {
    const operation: JumboOperation = {
      id: makeId(),
      jumboId,
      type,
      timestamp: nowIso(),
      operator,
      comment,
    };
    await operations.save(operation);
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
        await record(jumbo.id, JumboOperationType.receipt, batch.operator, "Приход партии");
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
      await record(jumboId, JumboOperationType.usageStart, operator);
      return updated;
    },

    async updateJumbo(jumbo, options) {
      await jumbos.save(jumbo);
      await record(
        jumbo.id,
        options?.type ?? JumboOperationType.edit,
        options?.operator,
        options?.comment,
      );
      return jumbo;
    },

    async operationsFor(jumboId) {
      return operations.forJumbo(jumboId);
    },
  };
}
