import type { ArchivedJumbo, CuttingSession, Machine, SessionDefect } from "@/models";
import { CuttingRollKind, RollDestination } from "@/models";
import { finishedMainWidthMm } from "@/core/calculator/calculatorLogic";
import { isWarehouseCustomer, WAREHOUSE_CUSTOMER } from "@/core/production/warehouseRun";

/**
 * jumboProduction — a **pure, normalized** derivation of everything that was
 * produced from one archived Jumbo, built from the frozen {@link ArchivedJumbo}
 * snapshot (its `sessions`, each carrying `result`, `rolls`, `defects` and the
 * historical `order`). It performs no cutting math and never touches live state,
 * so it is safe for old records and ready for future analytics.
 *
 * Design decisions that make the output analytics-friendly:
 * - Rolls are grouped by **size + length + destination**; different
 *   destinations of the same size are never merged.
 * - The **commercial** (operator-entered) main width is used
 *   (`finishedMainWidthMm`), never the technical cutting width.
 * - `destination` is the **historical** value from the snapshot: «Склад» for a
 *   warehouse run (or a roll booked to stock), otherwise the customer name at
 *   production time.
 */

/** «Нет данных» sentinel shown when a customer name is genuinely missing. */
export const NO_DATA = "Нет данных";

/** One produced roll size + length + destination, with its total count. */
export interface ProducedRollLine {
  kind: "main" | "additional" | "sample";
  widthMm: number;
  lengthM: number;
  count: number;
  /** Customer name or «Склад» — the historical destination of the rolls. */
  destination: string;
  /** True when the destination is the finished-goods warehouse. */
  toWarehouse: boolean;
}

/** Defects for one size / reason across the whole Jumbo. */
export interface JumboDefectLine {
  widthMm?: number;
  count: number;
  reason?: string;
}

/** How many rolls went to a single customer. */
export interface CustomerTally {
  customer: string;
  count: number;
}

export interface JumboProductionTotals {
  totalRolls: number;
  mainRolls: number;
  additionalRolls: number;
  sampleRolls: number;
  toWarehouse: number;
  toCustomers: number;
  byCustomer: CustomerTally[];
  defects: number;
  usedMaterialM: number;
  remainderM: number;
  initialWindingM: number;
  wastePercent: number;
  yieldPercent: number;
  cycles: number;
}

export interface JumboProduction {
  /** Grouped produced-roll lines (size + length + destination), sorted. */
  lines: ProducedRollLine[];
  defects: JumboDefectLine[];
  totals: JumboProductionTotals;
  /** Distinct operators across the Jumbo's sessions (may be several). */
  operators: string[];
  /** Distinct machines across the sessions. */
  machines: Machine[];
  /** First production timestamp on this Jumbo (ISO), or the archive time. */
  producedAt: string;
  materialCode: string;
  stockNumber: string;
}

/** The destination label of a produced size: «Склад» for a warehouse run or a
 *  roll booked to stock, otherwise the historical customer name. */
function destinationLabel(session: CuttingSession, toWarehouse: boolean): string {
  if (toWarehouse || isWarehouseCustomer(session.order.customer)) {
    return WAREHOUSE_CUSTOMER;
  }
  const customer = session.order.customer?.trim();
  return customer && customer.length > 0 ? customer : NO_DATA;
}

/** Two widths are the same size within 0.5 mm (guards float noise). */
function sameWidth(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.5;
}

/** Destination stored for a produced size, read from the per-roll snapshot. */
function destinationOfWidth(
  session: CuttingSession,
  kind: CuttingRollKind,
  widthMm: number,
): RollDestination {
  const rolls = session.rolls ?? [];
  const match = rolls.find((r) => r.kind === kind && sameWidth(r.widthMm, widthMm));
  return match?.destination ?? RollDestination.order;
}

/** Raw produced lines for one session (before cross-session grouping). */
function sessionLines(session: CuttingSession): ProducedRollLine[] {
  const result = session.result;
  const lengthM = result.roll_length_m;
  const lines: ProducedRollLine[] = [];

  // Main — commercial (operator) width, never the technical cutting width.
  if (result.total_main_rolls > 0) {
    const toWarehouse = destinationOfWidth(session, CuttingRollKind.main, finishedMainWidthMm(result)) === RollDestination.warehouse;
    lines.push({
      kind: "main",
      widthMm: finishedMainWidthMm(result),
      lengthM,
      count: result.total_main_rolls,
      destination: destinationLabel(session, toWarehouse),
      toWarehouse: toWarehouse || isWarehouseCustomer(session.order.customer),
    });
  }

  // Additional sizes — each its own line, real width from the result.
  const additionals: Array<{ width: number | null; count: number }> = [
    { width: result.additional_width_mm, count: result.total_additional_rolls_1 },
    { width: result.additional_width_mm_2, count: result.total_additional_rolls_2 },
  ];
  for (const add of additionals) {
    if (add.width && add.count > 0) {
      const toWarehouse = destinationOfWidth(session, CuttingRollKind.additional, add.width) === RollDestination.warehouse;
      lines.push({
        kind: "additional",
        widthMm: add.width,
        lengthM,
        count: add.count,
        destination: destinationLabel(session, toWarehouse),
        toWarehouse: toWarehouse || isWarehouseCustomer(session.order.customer),
      });
    }
  }

  // Samples («Образцы» mode) — each sample width, from the result snapshot.
  if (result.sample_mode && result.sample_groups) {
    for (const group of result.sample_groups) {
      if (group.total > 0) {
        const warehouse = isWarehouseCustomer(session.order.customer);
        lines.push({
          kind: "sample",
          widthMm: group.width,
          lengthM,
          count: group.total,
          destination: destinationLabel(session, warehouse),
          toWarehouse: warehouse,
        });
      }
    }
  }

  return lines;
}

/**
 * Builds the normalized production report for one archived Jumbo. Aggregates all
 * of the Jumbo's sessions; groups rolls by size + length + destination.
 */
export function buildJumboProduction(archived: ArchivedJumbo): JumboProduction {
  const { jumbo, sessions, statistics } = archived;

  // ── Grouped roll lines ────────────────────────────────────────────────────
  const groups = new Map<string, ProducedRollLine>();
  for (const session of sessions) {
    for (const line of sessionLines(session)) {
      const key = `${line.widthMm}|${line.lengthM}|${line.destination}`;
      const existing = groups.get(key);
      if (existing) {
        existing.count += line.count;
      } else {
        groups.set(key, { ...line });
      }
    }
  }
  const lines = Array.from(groups.values()).sort(
    (a, b) =>
      Number(a.toWarehouse) - Number(b.toWarehouse) ||
      b.widthMm - a.widthMm ||
      a.destination.localeCompare(b.destination),
  );

  // ── Roll totals ───────────────────────────────────────────────────────────
  let mainRolls = 0;
  let additionalRolls = 0;
  let sampleRolls = 0;
  let toWarehouse = 0;
  const byCustomerMap = new Map<string, number>();
  for (const line of lines) {
    if (line.kind === "main") mainRolls += line.count;
    else if (line.kind === "additional") additionalRolls += line.count;
    else sampleRolls += line.count;

    if (line.toWarehouse) {
      toWarehouse += line.count;
    } else {
      byCustomerMap.set(line.destination, (byCustomerMap.get(line.destination) ?? 0) + line.count);
    }
  }
  const totalRolls = mainRolls + additionalRolls + sampleRolls;
  const byCustomer = Array.from(byCustomerMap.entries())
    .map(([customer, count]) => ({ customer, count }))
    .sort((a, b) => b.count - a.count);
  const toCustomers = totalRolls - toWarehouse;

  // ── Defects (grouped by size + reason) ────────────────────────────────────
  const defectMap = new Map<string, JumboDefectLine>();
  let defectCount = 0;
  for (const session of sessions) {
    for (const d of (session.defects ?? []) as SessionDefect[]) {
      const count = d.count ?? 0;
      defectCount += count;
      const key = `${d.widthMm ?? ""}|${d.reason ?? ""}`;
      const existing = defectMap.get(key);
      if (existing) {
        existing.count += count;
      } else {
        defectMap.set(key, { widthMm: d.widthMm, count, reason: d.reason });
      }
    }
  }
  const defects = Array.from(defectMap.values()).sort((a, b) => b.count - a.count);

  // ── Meta ──────────────────────────────────────────────────────────────────
  const operators = Array.from(
    new Set(sessions.map((s) => s.order.operator?.trim()).filter((o): o is string => !!o)),
  );
  const machines = Array.from(new Set(sessions.map((s) => s.order.machine).filter(Boolean)));
  const producedAt =
    sessions.map((s) => s.createdAt).sort()[0] ?? archived.usageStartDate ?? archived.archivedAt;
  const cycles = sessions.reduce((sum, s) => sum + (s.result.cycles_used ?? 0), 0);

  return {
    lines,
    defects,
    totals: {
      totalRolls,
      mainRolls,
      additionalRolls,
      sampleRolls,
      toWarehouse,
      toCustomers,
      byCustomer,
      defects: defectCount,
      usedMaterialM: statistics.usedLengthM,
      remainderM: statistics.finalRemainderM,
      initialWindingM: statistics.initialWindingM,
      wastePercent: statistics.wastePercent,
      yieldPercent: statistics.usefulPercent,
      cycles,
    },
    operators,
    machines,
    producedAt,
    materialCode: jumbo.materialCode,
    stockNumber: jumbo.stockNumber,
  };
}
