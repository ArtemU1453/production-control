/** Type of operation recorded against a Jumbo. */
export enum JumboOperationType {
  /** Приход — Jumbo received into the warehouse. */
  receipt = "receipt",
  /** Нарезка — a cutting run consumed part of the Jumbo. */
  cut = "cut",
  /** Списание — Jumbo written off. */
  writeOff = "writeOff",
}

/**
 * A journal entry for one operation on a Jumbo.
 *
 * Each entry carries the deltas that later phases add to the Jumbo's stored
 * accumulators. Keeping the per-operation deltas here (rather than only the
 * running totals) preserves a full audit trail while the Jumbo record holds the
 * incrementally-maintained totals.
 */
export interface JumboOperation {
  id: string;
  jumboId: string;
  type: JumboOperationType;
  date: string;

  /** Length consumed by this operation, in metres. */
  usedLengthM: number;
  /** Useful area produced by this operation, in m². */
  usefulAreaM2: number;
  /** Waste/defect area produced by this operation, in m². */
  wasteAreaM2: number;
  /** Technological scrap produced by this operation, in m². */
  techScrapM2: number;

  orderId?: string;
  operator?: string;
  machineId?: string;
  note?: string;
}
