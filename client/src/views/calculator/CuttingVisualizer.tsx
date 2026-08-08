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
}: CuttingVisualizerProps) {
  const { stripes, groups, materialWidthMm } = model;

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
    <div className={cn("space-y-3", className)}>
      {/* Header: title + total Jumbo width. */}
      <div className="flex items-center justify-between gap-2">
        <div className={cn(AppTypography.subheadline)}>Схема раскроя</div>
        <div className={cn(AppTypography.footnote, "text-muted-foreground")}>
          Общая: <span className="font-semibold text-foreground">{formatMm(materialWidthMm)}</span>
        </div>
      </div>

      {/* The web between its trimmed edges. */}
      <div className="flex items-stretch gap-2 rounded-2xl border border-card-border bg-muted/20 p-3">
        {hasWaste ? (
          <span
            aria-hidden
            title="Отход (кромка)"
            className="w-1 shrink-0 self-stretch rounded-full bg-destructive"
          />
        ) : null}

        <div
          className="min-w-0 flex-1 space-y-1.5"
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
                            "flex h-14 min-w-0 flex-col items-center justify-center overflow-hidden rounded-lg text-center leading-none transition-opacity",
                            kindChipClass[kind],
                            isActive && "ring-2 ring-ring",
                            dim && "opacity-50",
                          )}
                        >
                          <span className="text-sm font-semibold tabular-nums">{chip.widthMm}</span>
                          <span className="mt-0.5 text-[10px] font-medium opacity-80">мм</span>
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
      <div className={cn(AppTypography.caption, "flex flex-wrap items-center gap-x-4 gap-y-1")}>
        {mainGroup ? (
          <LegendItem
            dotClass={kindDotClass.main}
            label={`Основная (${formatMm(mainGroup.widthMm)})`}
            dim={activeKind !== null && activeKind !== "main"}
            onEnter={() => onActiveKindChange("main")}
            onLeave={() => onActiveKindChange(null)}
          />
        ) : null}
        {additionalGroup ? (
          <LegendItem
            dotClass={kindDotClass.additional}
            label={`Доп. (${formatMm(additionalGroup.widthMm)})`}
            dim={activeKind !== null && activeKind !== "additional"}
            onEnter={() => onActiveKindChange("additional")}
            onLeave={() => onActiveKindChange(null)}
          />
        ) : null}
        {hasWaste ? (
          <LegendItem
            dotClass={kindDotClass.waste}
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
  label,
  dim,
  onEnter,
  onLeave,
}: {
  dotClass: string;
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
        "flex items-center gap-2 rounded-md px-1 py-0.5 outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring",
        dim && "opacity-50",
      )}
    >
      <span className={cn("h-2.5 w-2.5 rounded-full", dotClass)} />
      <span className="text-muted-foreground">{label}</span>
    </button>
  );
}
