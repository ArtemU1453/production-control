import type { CalcResult } from "@/services";

/**
 * cuttingModel — a **pure, presentational** derivation of the cutting layout
 * from an existing {@link CalcResult}.
 *
 * IMPORTANT: this module performs no engineering math. It only *arranges* values
 * the Calculation Engine already produced (widths, counts, waste-per-side,
 * lengths, areas) into shapes the visualisation and the results grid can render,
 * plus purely geometric display ratios (a stripe's share of the material width,
 * a single roll's area = width × length). No new formulas, no duplicated engine
 * logic. Every figure that carries production meaning comes verbatim from the
 * engine result.
 */

export type StripeKind = "main" | "additional" | "additional2" | "waste";

/** A single vertical band in the cross-section visualisation. */
export interface Stripe {
  id: string;
  kind: StripeKind;
  /** Physical width in millimetres (from the engine result). */
  widthMm: number;
  /** Share of the total material width, 0…100 — a display ratio only. */
  widthPercent: number;
  /** 0-based position across the material, left → right. */
  position: number;
  /** 1-based index among strips of the same kind (for labels/shading). */
  ordinal: number;
}

/** A grouped row for the results grid, one per stripe kind that is present. */
export interface StripeGroup {
  id: StripeKind;
  /** Human label, e.g. "Основные ручьи". */
  title: string;
  widthMm: number;
  /** Rolls produced across the whole order (engine totals). */
  totalRolls: number;
  /** Rolls produced per pass across the width (cross-section count). */
  perCycle: number;
  /** Length of a single roll, metres (engine value). */
  rollLengthM: number;
  /** Area of one physical roll, m² — geometry only (width × length). */
  rollAreaM2: number;
  /** Share of the material width, 0…100 — display ratio only. */
  widthPercent: number;
  tone: "primary" | "accent" | "accent2" | "danger";
  statusLabel: string;
}

export interface CuttingModel {
  materialWidthMm: number;
  usefulWidthMm: number;
  stripes: Stripe[];
  groups: StripeGroup[];
  /** Count of cutting knives (blade positions) implied by the cross-section. */
  knifeCount: number;
}

/** Threshold below which a stripe's inline label is hidden (too narrow). */
export const STRIPE_LABEL_MIN_PERCENT = 6;

/**
 * Distributes `items` (the cut rolls — never waste) into exactly `rows` visual
 * rows as evenly as possible: the first `items.length % rows` rows get one extra
 * item, the rest get the base count, so any two rows differ by at most one item.
 * Each row is filled left-to-right in the original order; the last (possibly
 * shorter) row starts at the left and leaves the right empty — it is never
 * centred. Purely a layout helper — it moves nothing about the cutting maths.
 *
 * Shared by every «Схема раскроя» (Расчёт and Производство both render through
 * CuttingVisualizer), so the row layout can never diverge between screens.
 */
export function distributeRollsIntoRows<T>(items: readonly T[], rows: number): T[][] {
  const rowCount = Math.max(1, Math.min(rows, items.length || 1));
  const base = Math.floor(items.length / rowCount);
  const remainder = items.length % rowCount;
  const result: T[][] = [];
  let cursor = 0;
  for (let r = 0; r < rowCount; r += 1) {
    const size = base + (r < remainder ? 1 : 0);
    result.push(items.slice(cursor, cursor + size));
    cursor += size;
  }
  return result;
}

/** Tailwind fill class per stripe kind; matches the legend + grid tones. */
export const STRIPE_FILL: Record<StripeKind, string> = {
  main: "hsl(var(--primary))",
  additional: "hsl(var(--accent))",
  // A distinct indigo/violet so the second additional size never blends into
  // the first (blue) — kept in sync with CuttingVisualizer's chip/dot classes.
  additional2: "#6366f1",
  waste: "hsl(var(--destructive))",
};

/**
 * Builds the presentational cutting model from an engine result. The stripe
 * order mirrors the physical cross-section exactly as the original screen drew
 * it: a trim strip on each edge, `main_count` identical main strips, and an
 * optional additional strip — the engine centres all leftover width to the
 * edges (`inner_waste_mm === 0`).
 */
export function buildCuttingModel(plan: CalcResult): CuttingModel {
  const {
    material_width_mm,
    useful_width_mm,
    main_count,
    roll_width_mm,
    additional_width_mm,
    additional_width_mm_2,
    waste_per_side_mm,
    roll_length_m,
    total_main_rolls,
    total_additional_rolls_1,
    total_additional_rolls_2,
  } = plan;

  const pct = (widthMm: number) =>
    material_width_mm > 0 ? (widthMm / material_width_mm) * 100 : 0;
  const rollArea = (widthMm: number) =>
    Math.round(((widthMm / 1000) * roll_length_m) * 100) / 100;

  const stripes: Stripe[] = [];
  let position = 0;
  const hasWaste = waste_per_side_mm > 0.01;

  if (hasWaste) {
    stripes.push({
      id: "waste-left",
      kind: "waste",
      widthMm: waste_per_side_mm,
      widthPercent: pct(waste_per_side_mm),
      position: position++,
      ordinal: 1,
    });
  }

  for (let i = 0; i < main_count; i++) {
    stripes.push({
      id: `main-${i}`,
      kind: "main",
      widthMm: roll_width_mm,
      widthPercent: pct(roll_width_mm),
      position: position++,
      ordinal: i + 1,
    });
  }

  if (additional_width_mm && additional_width_mm > 0) {
    stripes.push({
      id: "additional",
      kind: "additional",
      widthMm: additional_width_mm,
      widthPercent: pct(additional_width_mm),
      position: position++,
      ordinal: 1,
    });
  }

  // Second additional size — the engine cuts it from the width left after the
  // first additional lane, so it sits immediately after «additional» and before
  // the right trim. One lane per cycle, like the first.
  if (additional_width_mm_2 && additional_width_mm_2 > 0) {
    stripes.push({
      id: "additional2",
      kind: "additional2",
      widthMm: additional_width_mm_2,
      widthPercent: pct(additional_width_mm_2),
      position: position++,
      ordinal: 1,
    });
  }

  if (hasWaste) {
    stripes.push({
      id: "waste-right",
      kind: "waste",
      widthMm: waste_per_side_mm,
      widthPercent: pct(waste_per_side_mm),
      position: position++,
      ordinal: 2,
    });
  }

  const groups: StripeGroup[] = [];

  if (main_count > 0) {
    groups.push({
      id: "main",
      title: "Основные ручьи",
      widthMm: roll_width_mm,
      totalRolls: total_main_rolls,
      perCycle: main_count,
      rollLengthM: roll_length_m,
      rollAreaM2: rollArea(roll_width_mm),
      widthPercent: pct(roll_width_mm),
      tone: "primary",
      statusLabel: "В размер",
    });
  }

  if (additional_width_mm && additional_width_mm > 0) {
    groups.push({
      id: "additional",
      title: "Доп. ручей",
      widthMm: additional_width_mm,
      totalRolls: total_additional_rolls_1,
      perCycle: 1,
      rollLengthM: roll_length_m,
      rollAreaM2: rollArea(additional_width_mm),
      widthPercent: pct(additional_width_mm),
      tone: "accent",
      statusLabel: "Доп. размер",
    });
  }

  if (additional_width_mm_2 && additional_width_mm_2 > 0) {
    groups.push({
      id: "additional2",
      title: "Доп. ручей 2",
      widthMm: additional_width_mm_2,
      totalRolls: total_additional_rolls_2,
      perCycle: 1,
      rollLengthM: roll_length_m,
      rollAreaM2: rollArea(additional_width_mm_2),
      widthPercent: pct(additional_width_mm_2),
      tone: "accent2",
      statusLabel: "Доп. размер 2",
    });
  }

  if (hasWaste) {
    groups.push({
      id: "waste",
      title: "Кромка (обрез)",
      widthMm: waste_per_side_mm,
      totalRolls: 0,
      perCycle: 2,
      rollLengthM: roll_length_m,
      rollAreaM2: rollArea(waste_per_side_mm),
      widthPercent: pct(waste_per_side_mm * 2),
      tone: "danger",
      statusLabel: "Отход",
    });
  }

  // Knives sit between adjacent cut strips (main + additional). Two trimmed
  // edges add two outer blade positions. This is a count of the boundaries in
  // the arrangement above — not an engine quantity.
  const cutStrips =
    main_count +
    (additional_width_mm && additional_width_mm > 0 ? 1 : 0) +
    (additional_width_mm_2 && additional_width_mm_2 > 0 ? 1 : 0);
  const knifeCount = cutStrips > 0 ? cutStrips + 1 : 0;

  return {
    materialWidthMm: material_width_mm,
    usefulWidthMm: useful_width_mm,
    stripes,
    groups,
    knifeCount,
  };
}
