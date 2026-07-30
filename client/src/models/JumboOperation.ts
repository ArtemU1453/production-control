/** Type of operation recorded against a Jumbo in the journal. */
export enum JumboOperationType {
  /** Приход — Jumbo received into the warehouse. */
  receipt = "receipt",
  /** Начало использования — first use started. */
  usageStart = "usageStart",
  /** Изменение — record edited. */
  edit = "edit",
  /** Корректировка — manual correction of values. */
  adjustment = "adjustment",
  /** Архивирование — moved to the archive. */
  archive = "archive",
  /** Расчёт — consumed by a cutting run (added automatically in a later phase). */
  calculation = "calculation",
  /** Брак — defect recorded (later phase). */
  defect = "defect",
  /** Списание — written off (later phase). */
  writeOff = "writeOff",
}

const titles: Record<JumboOperationType, string> = {
  [JumboOperationType.receipt]: "Приход",
  [JumboOperationType.usageStart]: "Начало использования",
  [JumboOperationType.edit]: "Изменение",
  [JumboOperationType.adjustment]: "Корректировка",
  [JumboOperationType.archive]: "Архивирование",
  [JumboOperationType.calculation]: "Расчёт",
  [JumboOperationType.defect]: "Брак",
  [JumboOperationType.writeOff]: "Списание",
};

export function jumboOperationTitle(type: JumboOperationType): string {
  return titles[type];
}

/**
 * A journal entry for one operation on a Jumbo.
 *
 * Core fields (timestamp, type, comment, operator) are recorded automatically
 * whenever a Jumbo is received, edited or archived. The optional delta fields
 * carry the per-operation increments that later phases add to the Jumbo's
 * stored accumulators — keeping a full audit trail without recomputing totals.
 */
export interface JumboOperation {
  id: string;
  jumboId: string;
  type: JumboOperationType;
  /** Date and time of the operation (ISO-8601). */
  timestamp: string;
  comment?: string;
  operator?: string;

  usedLengthDeltaM?: number;
  usefulAreaDeltaM2?: number;
  wasteAreaDeltaM2?: number;
  scrapAreaDeltaM2?: number;
}
