import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatMm } from "@/extensions/number";
import { AppTypography } from "@/designsystem";
import type { CuttingModel, StripeKind } from "./cuttingModel";

interface CuttingVisualizerProps {
  model: CuttingModel;
  /** Currently highlighted stripe kind (shared with the results grid). */
  activeKind: StripeKind | null;
  onActiveKindChange: (kind: StripeKind | null) => void;
  className?: string;
  /**
   * Dense variant for the machine cards on the Production screen: shorter chips,
   * smaller type, thinner trim lines and tighter spacing, so the scheme reads as
   * a compact hint between the parameters and the stats — not a big panel. The
   * default (roomier) variant is kept for the Calculator screen.
   */
  compact?: boolean;
}

const KIND_LABEL: Record<StripeKind, string> = {
  main: "Основная",
  additional: "Доп.",
  waste: "Отход",
};

/**
 * CuttingVisualizer — a compact production indicator of the cutting layout.
 *
 * It shows the full Jumbo width as a dark, rounded card bounded by thin red trim
 * lines (the waste edges), filled with one rounded chip per cut lane: light-grey
 * for main lanes, blue for the additional lane. Each chip's width is proportional
 * to its physical width where space allows; chips wrap into several rows on
 * narrow screens instead of ever scrolling horizontally. A dynamic legend below
 * names only the kinds actually present.
 *
 * Purely presentational — it renders the {@link CuttingModel} the engine already
 * produced and computes no production figures.
 */
export function CuttingVisualizer({
  model,
  activeKind,
  onActiveKindChange,
  className,
  compact = false,
}: CuttingVisualizerProps) {
  const { stripes, groups, materialWidthMm } = model;

  // Size tokens — the only difference between the dense (Production) and roomy
  // (Calculator) variants. Layout math and colours are identical.
  const ui = compact
    ? {
        outer: "space-y-1.5",
        title: AppTypography.footnote,
        total: AppTypography.caption,
        pad: "gap-1.5 p-1.5",
        edge: "w-0.5",
        rows: "space-y-1",
        chip: "h-8",
        num: "text-[11px]",
        unit: "text-[8px]",
        legend: cn(AppTypography.caption, "gap-x-3"),
        dot: "h-2 w-2",
      }
    : {
        outer: "space-y-3",
        title: AppTypography.subheadline,
        total: AppTypography.footnote,
        pad: "gap-2 p-3",
        edge: "w-1",
        rows: "space-y-1.5",
        chip: "h-14",
        num: "text-sm",
        unit: "text-[10px]",
        legend: cn(AppTypography.caption, "gap-x-4"),
        dot: "h-2.5 w-2.5",
      };

  // Only the cut lanes become chips; the trimmed edges are drawn as the red
  // side lines, not as chips.
  const laneChips = useMemo(
    () => stripes.filter((s) => s.kind !== "waste"),
    [stripes],
  );
  const hasWaste = groups.some((g) => g.id === "waste");
  const mainGroup = groups.find((g) => g.id === "main") ?? null;
  const additionalGroup = groups.find((g) => g.id === "additional") ?? null;

  // Two-row staggered ("brick") layout. Lanes are split as evenly as possible
  // between exactly two rows (counts differ by ≤ 1); the second row is shifted
  // right by half a lane so rolls sit in a checkerboard, never one above another.
  // A single global scale (% of container per mm) keeps every chip's width
  // proportional to its real size and guarantees the widest row — including the
  // stagger offset and inter-chip gaps — never exceeds the container (so there is
  // no wrap, no third row, and no horizontal scroll; chips shrink on narrow
  // screens instead). Nothing here touches the cutting math — only placement.
  const layout = useMemo(() => {
    const items = laneChips;
    const n = items.length;
    if (n === 0) {
      return null;
    }
    const half = Math.ceil(n / 2);
    const row1 = items.slice(0, half);
    const row2 = items.slice(half);
    const firstWidthMm = items[0].widthMm;
    const gapUnitMm = firstWidthMm * 0.14; // inter-chip gap ≈ 14% of a lane
    const offsetMm = row2.length > 0 ? firstWidthMm / 2 : 0; // stagger ≈ half a lane
    const sumMm = (arr: typeof items) => arr.reduce((sum, chip) => sum + chip.widthMm, 0);
    const row1Units = sumMm(row1) + gapUnitMm * Math.max(0, row1.length - 1);
    const row2Units = offsetMm + sumMm(row2) + gapUnitMm * Math.max(0, row2.length - 1);
    const constrained = Math.max(row1Units, row2Units, 1);
    const scale = 96 / constrained; // % per mm; widest row ≤ 96% of the container
    return {
      row1,
      row2,
      scale,
      gapPct: gapUnitMm * scale,
      offsetPct: offsetMm * scale,
    };
  }, [laneChips]);

  const kindChipClass: Record<Exclude<StripeKind, "waste">, string> = {
    main: "bg-slate-300 text-slate-900",
    additional: "bg-primary text-primary-foreground",
  };
  const kindDotClass: Record<StripeKind, string> = {
    main: "bg-slate-300",
    additional: "bg-primary",
    waste: "bg-destructive",
  };

  return (
    <div className={cn(ui.outer, className)}>
      {/* Header: title + total Jumbo width. */}
      <div className="flex items-center justify-between gap-2">
        <div className={cn(ui.title)}>Схема раскроя</div>
        <div className={cn(ui.total, "font-semibold")}>{formatMm(materialWidthMm)}</div>
      </div>

      {/* The web between its trimmed edges. */}
      <div className={cn("flex items-stretch rounded-xl border border-card-border bg-muted/20", ui.pad)}>
        {hasWaste ? (
          <span
            aria-hidden
            title="Отход (кромка)"
            className={cn("shrink-0 self-stretch rounded-full bg-destructive", ui.edge)}
          />
        ) : null}

        <div
          className={cn("min-w-0 flex-1", ui.rows)}
          role="img"
          aria-label={`Схема раскроя материала шириной ${formatMm(materialWidthMm)}: ${laneChips.length} полос в два ряда.`}
        >
          {layout
            ? [layout.row1, layout.row2].map((rowItems, rowIndex) =>
                rowItems.length === 0 ? null : (
                  <div key={rowIndex} className="flex flex-nowrap items-stretch">
                    {rowItems.map((chip, idx) => {
                      const kind = chip.kind as Exclude<StripeKind, "waste">;
                      const isActive = activeKind === kind;
                      const dim = activeKind !== null && !isActive;
                      // First chip of row 2 carries the stagger offset; every
                      // other chip carries the inter-chip gap as a left margin.
                      const marginLeftPct =
                        idx === 0 ? (rowIndex === 1 ? layout.offsetPct : 0) : layout.gapPct;
                      return (
                        <div
                          key={chip.id}
                          onMouseEnter={() => onActiveKindChange(kind)}
                          onMouseLeave={() => onActiveKindChange(null)}
                          title={`${KIND_LABEL[kind]} — ${formatMm(chip.widthMm)}`}
                          style={{
                            width: `${chip.widthMm * layout.scale}%`,
                            marginLeft: `${marginLeftPct}%`,
                          }}
                          className={cn(
                            "flex min-w-0 flex-col items-center justify-center overflow-hidden rounded-md text-center leading-none transition-opacity",
                            ui.chip,
                            kindChipClass[kind],
                            isActive && "ring-2 ring-ring",
                            dim && "opacity-50",
                          )}
                        >
                          <span className={cn("font-semibold tabular-nums", ui.num)}>{chip.widthMm}</span>
                          <span className={cn("font-medium opacity-80", ui.unit)}>мм</span>
                        </div>
                      );
                    })}
                  </div>
                ),
              )
            : null}
        </div>

        {hasWaste ? (
          <span
            aria-hidden
            title="Отход (кромка)"
            className="w-1 shrink-0 self-stretch rounded-full bg-destructive"
          />
        ) : null}
      </div>

      {/* Dynamic legend — only the kinds actually present. */}
      <div className={cn(ui.legend, "flex flex-wrap items-center gap-y-1")}>
        {mainGroup ? (
          <LegendItem
            dotClass={kindDotClass.main}
            dotSize={ui.dot}
            label={`Основная ${formatMm(mainGroup.widthMm)}`}
            dim={activeKind !== null && activeKind !== "main"}
            onEnter={() => onActiveKindChange("main")}
            onLeave={() => onActiveKindChange(null)}
          />
        ) : null}
        {additionalGroup ? (
          <LegendItem
            dotClass={kindDotClass.additional}
            dotSize={ui.dot}
            label={`Доп. ${formatMm(additionalGroup.widthMm)}`}
            dim={activeKind !== null && activeKind !== "additional"}
            onEnter={() => onActiveKindChange("additional")}
            onLeave={() => onActiveKindChange(null)}
          />
        ) : null}
        {hasWaste ? (
          <LegendItem
            dotClass={kindDotClass.waste}
            dotSize={ui.dot}
            label="Отход"
            dim={activeKind !== null && activeKind !== "waste"}
            onEnter={() => onActiveKindChange("waste")}
            onLeave={() => onActiveKindChange(null)}
          />
        ) : null}
      </div>
    </div>
  );
}

function LegendItem({
  dotClass,
  dotSize,
  label,
  dim,
  onEnter,
  onLeave,
}: {
  dotClass: string;
  dotSize: string;
  label: string;
  dim: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  return (
    <button
      type="button"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-1 py-0.5 outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring",
        dim && "opacity-50",
      )}
    >
      <span className={cn("rounded-full", dotSize, dotClass)} />
      <span className="text-muted-foreground">{label}</span>
    </button>
  );
}
