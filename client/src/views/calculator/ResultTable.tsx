import { cn } from "@/lib/utils";
import type { CalcResult } from "@/services";
import { AppTypography } from "@/designsystem";
import { formatArea, formatMeters, formatMm, formatPercent } from "@/extensions/number";
import { fillFor, type CuttingModel, type StripeKind } from "./cuttingModel";

interface ResultTableProps {
  plan: CalcResult;
  model: CuttingModel;
  activeKind: StripeKind | null;
  onActiveKindChange: (kind: StripeKind | null) => void;
  className?: string;
}

const COLUMNS = "grid-cols-[1.5fr_0.9fr_1fr_0.9fr_1fr_0.7fr_0.9fr]";

/**
 * ResultTable — the results grid ("таблица результатов").
 *
 * One row per stripe group, its colour keyed to the cross-section so hovering a
 * row highlights the matching band and vice-versa (`activeKind`). Renders as a
 * data grid on wide screens and as stacked cards on mobile. Counts, widths,
 * lengths and areas are engine outputs; the width-share column is a display
 * ratio. Aggregate area/waste in the footer come verbatim from the engine.
 */
export function ResultTable({
  plan,
  model,
  activeKind,
  onActiveKindChange,
  className,
}: ResultTableProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Desktop / tablet grid. */}
      <div className="hidden overflow-hidden rounded-2xl border border-card-border md:block">
        <div
          className={cn(
            "grid bg-muted/50 px-3 py-1.5",
            COLUMNS,
            AppTypography.caption2,
            "text-muted-foreground",
          )}
        >
          <span>Тип / размер</span>
          <span className="text-right">Ширина</span>
          <span className="text-right">Кол-во</span>
          <span className="text-right">Длина</span>
          <span className="text-right">Площадь рул.</span>
          <span className="text-right">Доля</span>
          <span className="text-right">Статус</span>
        </div>
        {model.groups.map((group) => {
          const active = activeKind === group.kind;
          return (
            <div
              key={group.id}
              onMouseEnter={() => onActiveKindChange(group.kind)}
              onMouseLeave={() => onActiveKindChange(null)}
              className={cn(
                "grid items-center border-t border-card-border px-3 py-1.5 transition-colors",
                COLUMNS,
                AppTypography.footnote,
                "tabular-nums",
                active && "bg-muted/60",
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-[3px]"
                  style={{ background: fillFor(group.kind, group.sampleIndex) }}
                  aria-hidden
                />
                <span className="truncate font-medium">{group.title}</span>
              </span>
              <span className="text-right">{formatMm(group.widthMm)}</span>
              <span className="text-right">
                {group.kind === "waste" ? "—" : `${group.totalRolls} шт.`}
                {group.kind !== "waste" ? (
                  <span className="ml-1 text-muted-foreground">·{group.perCycle}/ц</span>
                ) : null}
              </span>
              <span className="text-right">{formatMeters(group.rollLengthM)}</span>
              <span className="text-right">{formatArea(group.rollAreaM2)}</span>
              <span className="text-right">{formatPercent(group.widthPercent)}</span>
              <span className="text-right">
                <StatusPill fill={fillFor(group.kind, group.sampleIndex)} label={group.statusLabel} />
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile cards. */}
      <div className="space-y-2 md:hidden">
        {model.groups.map((group) => {
          const active = activeKind === group.kind;
          return (
            <div
              key={group.id}
              onTouchStart={() => onActiveKindChange(group.kind)}
              className={cn(
                "rounded-2xl border border-card-border p-3 transition-colors",
                active && "bg-muted/60",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-[3px]"
                    style={{ background: fillFor(group.kind, group.sampleIndex) }}
                    aria-hidden
                  />
                  <span className={cn(AppTypography.subheadline)}>{group.title}</span>
                </span>
                <StatusPill fill={fillFor(group.kind, group.sampleIndex)} label={group.statusLabel} />
              </div>
              <div className={cn(AppTypography.caption, "mt-2 grid grid-cols-3 gap-2 tabular-nums")}>
                <Cell label="Ширина" value={formatMm(group.widthMm)} />
                <Cell
                  label="Кол-во"
                  value={group.kind === "waste" ? "—" : `${group.totalRolls} шт.`}
                />
                <Cell label="Длина" value={formatMeters(group.rollLengthM)} />
                <Cell label="Площадь рул." value={formatArea(group.rollAreaM2)} />
                <Cell label="Доля ширины" value={formatPercent(group.widthPercent)} />
                {group.kind !== "waste" ? (
                  <Cell label="На цикл" value={`${group.perCycle} шт.`} />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Aggregate footer — engine figures. */}
      <div className={cn(AppTypography.caption, "grid grid-cols-2 gap-2 sm:grid-cols-4")}>
        <Cell label="Общая площадь" value={formatArea(plan.total_area_m2)} />
        <Cell label="Полезная площадь" value={formatArea(plan.useful_area_m2)} />
        <Cell label="Площадь отхода" value={formatArea(plan.waste_area_m2)} />
        <Cell label="Отход" value={formatPercent(plan.waste_percent)} tone="danger" />
      </div>
    </div>
  );
}

function Cell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "danger";
}) {
  return (
    <div className="min-w-0">
      <div className="truncate text-muted-foreground">{label}</div>
      <div className={cn("font-semibold tabular-nums", tone === "danger" ? "text-destructive" : "text-foreground")}>
        {value}
      </div>
    </div>
  );
}

function StatusPill({ fill, label }: { fill: string; label: string }) {
  return (
    <span
      className={cn(AppTypography.caption2, "inline-flex items-center gap-1 rounded-full px-2 py-0.5")}
      style={{
        background: `color-mix(in srgb, ${fill} 16%, transparent)`,
        color: fill,
      }}
    >
      {label}
    </span>
  );
}
