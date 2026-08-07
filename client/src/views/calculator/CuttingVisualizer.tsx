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
  const { stripes, groups, materialWidthMm, usefulWidthMm } = model;

  // Only the cut lanes become chips; the trimmed edges are drawn as the red
  // side lines, not as chips.
  const laneChips = useMemo(
    () => stripes.filter((s) => s.kind !== "waste"),
    [stripes],
  );
  const hasWaste = groups.some((g) => g.id === "waste");
  const mainGroup = groups.find((g) => g.id === "main") ?? null;
  const additionalGroup = groups.find((g) => g.id === "additional") ?? null;

  // Width basis: a chip's share of the useful (cut) width, so the lanes fill the
  // area between the trim lines. A floor keeps labels readable; when the floors
  // no longer fit the row, chips wrap to the next line (no horizontal scroll).
  const widthFor = (widthMm: number) =>
    usefulWidthMm > 0 ? (widthMm / usefulWidthMm) * 100 : 100 / Math.max(1, laneChips.length);

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
          className="flex flex-1 flex-wrap content-center items-stretch gap-1.5"
          role="img"
          aria-label={`Схема раскроя материала шириной ${formatMm(materialWidthMm)}: ${laneChips.length} полос.`}
        >
          {laneChips.map((chip) => {
            const kind = chip.kind as Exclude<StripeKind, "waste">;
            const isActive = activeKind === kind;
            const dim = activeKind !== null && !isActive;
            return (
              <div
                key={chip.id}
                onMouseEnter={() => onActiveKindChange(kind)}
                onMouseLeave={() => onActiveKindChange(null)}
                title={`${KIND_LABEL[kind]} — ${formatMm(chip.widthMm)}`}
                style={{ width: `calc(${widthFor(chip.widthMm)}% - 6px)`, minWidth: 40 }}
                className={cn(
                  "flex h-14 flex-col items-center justify-center rounded-lg text-center leading-none transition-opacity",
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
