import type { CuttingSession, FinishedRoll, SessionDefect } from "@/models";
import { FinishedRollStatus } from "@/models";
import { finishedMainWidthMm } from "@/core/calculator/calculatorLogic";

/**
 * sessionReport — a **pure, structured** derivation of the full per-cutting
 * report from data the app already persisted: the {@link CuttingSession}
 * snapshot (order, Jumbo, the `result` CalcResult, produced counts) plus the
 * {@link FinishedRoll} ledger linked to that session (warehouse / sold /
 * written-off movement). It performs no cutting math — it only reads the stored
 * snapshot and aggregates the finished-goods movement, so opening an old record
 * never re-runs the current cutting algorithm.
 *
 * The output shape is deliberately analytics-friendly: every roll size is a
 * separate line with its own produced/order/warehouse/sold/written-off/remaining
 * quantities, so the «Аналитика» section can consume it directly.
 */

/** Movement of one roll size after production. */
export interface RollMovement {
  /** Produced in this cutting (from the session's result snapshot). */
  produced: number;
  /** Delivered to the customer order (produced − booked to warehouse). */
  toOrder: number;
  /** Booked onto the finished-goods warehouse (any later status). */
  toWarehouse: number;
  /** Currently held for a shipment but still in the warehouse. */
  reserved: number;
  /** Shipped out / sold. */
  sold: number;
  /** Written off (defect found later / damage). */
  writtenOff: number;
  /** Still physically in the warehouse (in stock + reserved). */
  remaining: number;
}

export type SessionRollKind = "main" | "additional" | "sample";

/** One roll size within the report, with its movement. */
export interface SessionRollLine {
  kind: SessionRollKind;
  /** Human label, e.g. «Основной», «Доп. 1», «Образец 2». */
  label: string;
  widthMm: number;
  lengthM: number;
  movement: RollMovement;
}

export interface SessionReport {
  session: CuttingSession;
  /** Main roll size(s) — normally one line. */
  mainLines: SessionRollLine[];
  /** Each additional size as its own line (never merged). */
  additionalLines: SessionRollLine[];
  /** Each sample size as its own line (samples mode). */
  sampleLines: SessionRollLine[];
  /** All produced roll lines, main → additional → sample. */
  allLines: SessionRollLine[];
  /** Defects recorded for this session's Jumbo. */
  defects: SessionDefect[];
  defectCount: number;
  /** Roll totals across all sizes. */
  totals: {
    produced: number;
    toOrder: number;
    toWarehouse: number;
    sold: number;
    writtenOff: number;
    remaining: number;
  };
}

/** Two widths are the same size within 0.5 mm (guards float noise). */
function sameWidth(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.5;
}

/**
 * Builds the movement for one produced size from the finished-goods ledger of
 * this session. `produced` comes from the cutting snapshot; the rest is counted
 * from FinishedRoll records of the matching width. Rolls delivered to the
 * customer order never become FinishedRoll records, so `toOrder` is the
 * remainder of `produced` after what was booked to the warehouse.
 */
function movementForWidth(produced: number, widthMm: number, finishedForSession: FinishedRoll[]): RollMovement {
  const ofSize = finishedForSession.filter((r) => sameWidth(r.widthMm, widthMm));
  const countBy = (status: FinishedRollStatus) =>
    ofSize.filter((r) => r.status === status).reduce((s, r) => s + (r.count ?? 1), 0);
  const toWarehouse = ofSize.reduce((s, r) => s + (r.count ?? 1), 0);
  const reserved = countBy(FinishedRollStatus.reserved);
  const inStock = countBy(FinishedRollStatus.inStock);
  const inOrderStock = countBy(FinishedRollStatus.inOrder);
  const sold = countBy(FinishedRollStatus.shipped);
  const writtenOff = countBy(FinishedRollStatus.writtenOff);
  const remaining = inStock + reserved + inOrderStock;
  const toOrder = Math.max(0, produced - toWarehouse);
  return { produced, toOrder, toWarehouse, reserved, sold, writtenOff, remaining };
}

export function buildSessionReport(session: CuttingSession, finishedRolls: FinishedRoll[]): SessionReport {
  const result = session.result;
  const rollLengthM = result.roll_length_m;
  // Finished-goods records belonging to this exact session (not the whole chain).
  const finishedForSession = finishedRolls.filter(
    (r) => r.sessionId === session.id && r.jumboStockNumber === session.jumboStockNumber,
  );

  const mainLines: SessionRollLine[] = [];
  if (result.total_main_rolls > 0) {
    // Товарный размер (заданный оператором), а не технический размер раскроя —
    // готовые рулоны на складе оприходованы именно под этой шириной, поэтому и
    // сопоставление движения по складу идёт по ней.
    const mainWidthMm = finishedMainWidthMm(result);
    mainLines.push({
      kind: "main",
      label: "Основной",
      widthMm: mainWidthMm,
      lengthM: rollLengthM,
      movement: movementForWidth(result.total_main_rolls, mainWidthMm, finishedForSession),
    });
  }

  const additionalLines: SessionRollLine[] = [];
  if (result.additional_width_mm && result.total_additional_rolls_1 > 0) {
    additionalLines.push({
      kind: "additional",
      label: "Доп. 1",
      widthMm: result.additional_width_mm,
      lengthM: rollLengthM,
      movement: movementForWidth(result.total_additional_rolls_1, result.additional_width_mm, finishedForSession),
    });
  }
  if (result.additional_width_mm_2 && result.total_additional_rolls_2 > 0) {
    additionalLines.push({
      kind: "additional",
      label: "Доп. 2",
      widthMm: result.additional_width_mm_2,
      lengthM: rollLengthM,
      movement: movementForWidth(result.total_additional_rolls_2, result.additional_width_mm_2, finishedForSession),
    });
  }

  const sampleLines: SessionRollLine[] = [];
  if (result.sample_mode && result.sample_groups) {
    result.sample_groups.forEach((group, index) => {
      sampleLines.push({
        kind: "sample",
        label: `Образец ${index + 1}`,
        widthMm: group.width,
        lengthM: rollLengthM,
        movement: movementForWidth(group.total, group.width, finishedForSession),
      });
    });
  }

  const allLines = [...mainLines, ...additionalLines, ...sampleLines];
  const defects = session.defects ?? [];
  const defectCount = defects.reduce((s, d) => s + (d.count ?? 0), 0);

  const totals = allLines.reduce(
    (acc, line) => ({
      produced: acc.produced + line.movement.produced,
      toOrder: acc.toOrder + line.movement.toOrder,
      toWarehouse: acc.toWarehouse + line.movement.toWarehouse,
      sold: acc.sold + line.movement.sold,
      writtenOff: acc.writtenOff + line.movement.writtenOff,
      remaining: acc.remaining + line.movement.remaining,
    }),
    { produced: 0, toOrder: 0, toWarehouse: 0, sold: 0, writtenOff: 0, remaining: 0 },
  );

  return { session, mainLines, additionalLines, sampleLines, allLines, defects, defectCount, totals };
}
