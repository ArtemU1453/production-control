import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatMm } from "@/extensions/number";
import { AppTypography } from "@/designsystem";
import { distributeRollsIntoRows, type CuttingModel, type StripeKind } from "./cuttingModel";

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
  additional2: "Доп. 2",
  waste: "Отход",
};

/**
 * CuttingVisualizer — a compact production indicator of the cutting layout.
 *
 * It shows the full Jumbo width as a dark, rounded card bounded by thin red trim
 * lines (the waste edges), filled with one rounded chip per cut lane: light-grey
 * for main lanes, blue for the first additional lane and indigo for the second.
 * The chips are laid out in two staggered (brick) rows; each chip shows its
 * physical width in millimetres. A dynamic legend below names only the kinds
 * actually present.
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
  const wasteGroup = groups.find((g) => g.id === "waste") ?? null;
  const hasWaste = wasteGroup !== null;
  const mainGroup = groups.find((g) => g.id === "main") ?? null;
  const additionalGroup = groups.find((g) => g.id === "additional") ?? null;
  const additionalGroup2 = groups.find((g) => g.id === "additional2") ?? null;

  // Trim edge: a thin red bar (roomy) or, on the compact production card, a small
  // labelled red block ("ОТХОД / N мм") on each side per the operator spec.
  const wasteEdge = compact ? (
    <div
      aria-hidden
      title={`Отход ${formatMm(wasteGroup?.widthMm ?? 0)} с каждой стороны`}
      className="flex shrink-0 flex-col items-center justify-center self-stretch rounded-md bg-destructive/15 px-1.5 text-destructive"
      style={{ minWidth: 46 }}
    >
      <span className="text-[8px] font-semibold uppercase leading-none">Отход</span>
      <span className="mt-0.5 text-[10px] font-bold leading-none">{wasteGroup?.widthMm ?? 0} мм</span>
    </div>
  ) : (
    <span aria-hidden title="Отход (кромка)" className={cn("shrink-0 self-stretch rounded-full bg-destructive", ui.edge)} />
  );

  // Inter-chip gap (px), per variant.
  const gapPx = compact ? 4 : 6;

  // Always exactly TWO rows: top = ceil(n/2), bottom = floor(n/2) — so the top
  // row has at most one more roll than the bottom, and the bottom never has more
  // than the top (a single roll shows one row). Chips shrink to fit narrow
  // screens; the scheme never collapses to one long row or grows a third row.
  // Waste is not part of this — the trimmed edges are separate red elements
  // flanking the block.
  //
  // The two rows are STAGGERED (шахматное/кирпичное смещение): the top row is
  // flush-left, the bottom row is shifted right by half a chip + one gap so its
  // chips sit centred between the top row's chips. Every chip shares one fixed
  // width so the offset lands cleanly. The width is sized to whichever row is
  // widest once the offset is added: for an even total the offset bottom row is
  // the constraint; for an odd total (top has one extra chip) the top row is.
  // This holds for any count, even or odd, and never overflows the web.
  const layout = useMemo(() => {
    const items = laneChips;
    if (items.length === 0) {
      return null;
    }
    const rows = distributeRollsIntoRows(items, 2).filter((row) => row.length > 0);
    const topCount = rows[0].length; // ceil(n/2)
    const bottomCount = rows[1]?.length ?? 0; // floor(n/2)
    const even = topCount === bottomCount;
    const widthExpr = even
      ? `(100% - ${bottomCount * gapPx}px) / ${bottomCount + 0.5}`
      : `(100% - ${(topCount - 1) * gapPx}px) / ${topCount}`;
    const chipWidth = `calc(${widthExpr})`;
    // ½ chip + one inter-chip gap → the brick offset for the bottom row.
    const offset = `calc((${widthExpr}) / 2 + ${gapPx}px)`;
    return { rows, chipWidth, offset };
  }, [laneChips, gapPx]);

  const kindChipClass: Record<Exclude<StripeKind, "waste">, string> = {
    main: "bg-slate-300 text-slate-900",
    additional: "bg-primary text-primary-foreground",
    // Distinct indigo/violet so доп#2 is never confused with доп#1 (blue).
    additional2: "bg-indigo-500 text-white",
  };
  const kindDotClass: Record<StripeKind, string> = {
    main: "bg-slate-300",
    additional: "bg-primary",
    additional2: "bg-indigo-500",
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
        {hasWaste ? wasteEdge : null}

        <div
          className={cn("min-w-0 flex-1", ui.rows)}
          role="img"
          aria-label={`Схема раскроя материала шириной ${formatMm(materialWidthMm)}: ${laneChips.length} полос в два ряда.`}
        >
          {layout
            ? layout.rows.map((rowItems, rowIndex) => (
                <div
                  key={rowIndex}
                  className="flex flex-nowrap items-stretch justify-start"
                  // Bottom row is offset half a chip + a gap → staggered/brick rows.
                  style={{ gap: gapPx, marginLeft: rowIndex === 1 ? layout.offset : undefined }}
                >
                  {rowItems.map((chip) => {
                    const kind = chip.kind as Exclude<StripeKind, "waste">;
                    const isActive = activeKind === kind;
                    const dim = activeKind !== null && !isActive;
                    return (
                      <div
                        key={chip.id}
                        onMouseEnter={() => onActiveKindChange(kind)}
                        onMouseLeave={() => onActiveKindChange(null)}
                        title={`${KIND_LABEL[kind]} — ${formatMm(chip.widthMm)}`}
                        // Fixed chip width shared by both rows so the offset bottom
                        // row staggers cleanly against the top row.
                        style={{ width: layout.chipWidth }}
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
              ))
            : null}
        </div>

        {hasWaste ? wasteEdge : null}
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
        {additionalGroup2 ? (
          <LegendItem
            dotClass={kindDotClass.additional2}
            dotSize={ui.dot}
            label={`Доп. 2 ${formatMm(additionalGroup2.widthMm)}`}
            dim={activeKind !== null && activeKind !== "additional2"}
            onEnter={() => onActiveKindChange("additional2")}
            onLeave={() => onActiveKindChange(null)}
          />
        ) : null}
        {hasWaste ? (
          <LegendItem
            dotClass={kindDotClass.waste}
            dotSize={ui.dot}
            label={`Отход (${formatMm(wasteGroup?.widthMm ?? 0)} с каждой стороны)`}
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
