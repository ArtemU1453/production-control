import { cn } from "@/lib/utils";
import type { CalcResult } from "@/services";
import { AppTypography } from "@/designsystem";
import { formatMeters } from "@/extensions/number";

interface JumboLengthGaugeProps {
  plan: CalcResult;
  className?: string;
}

/**
 * JumboLengthGauge — the production length scale ("производственная шкала").
 *
 * Shows how the Jumbo is consumed along its wound length: the run already
 * planned, a preview of where the next cycle would end, and the leftover. All
 * lengths come straight from the engine result; the widths here are simple
 * proportions of `big_roll_length_m`, used only to lay the bar out.
 */
export function JumboLengthGauge({ plan, className }: JumboLengthGaugeProps) {
  const total = plan.big_roll_length_m;
  const used = Math.min(plan.used_length_m, total);
  const remaining = Math.max(0, plan.remaining_jumbo_m);
  const usedPct = total > 0 ? (used / total) * 100 : 0;
  const remainingPct = total > 0 ? (remaining / total) * 100 : 0;

  // Preview of the next cycle, only the part that still fits in the leftover.
  const nextCycleM = Math.min(plan.roll_length_m, remaining);
  const nextPct = total > 0 ? (nextCycleM / total) * 100 : 0;
  const fitsNextCycle = remaining >= plan.roll_length_m && plan.shortage_rolls === 0;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={cn(AppTypography.subheadline)}>Производственная шкала · длина Джамбы</span>
        <span className={cn(AppTypography.footnote, "text-muted-foreground")}>
          Всего: <span className="font-semibold text-foreground">{formatMeters(total)}</span>
        </span>
      </div>

      <div
        className="flex h-8 w-full overflow-hidden rounded-full border border-card-border bg-muted/40"
        role="progressbar"
        aria-valuenow={Math.round(usedPct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Использовано ${formatMeters(used)} из ${formatMeters(total)}`}
      >
        <div
          className="flex h-full items-center justify-center bg-primary text-[10px] font-semibold text-primary-foreground transition-[width] duration-500"
          style={{ width: `${usedPct}%` }}
        >
          {usedPct > 12 ? `${Math.round(usedPct)}%` : ""}
        </div>
        {nextPct > 0 ? (
          <div
            className="h-full transition-[width] duration-500"
            style={{
              width: `${nextPct}%`,
              backgroundImage:
                "repeating-linear-gradient(45deg, hsl(var(--accent)) 0 6px, hsl(var(--accent) / 0.55) 6px 12px)",
            }}
            title={`Следующий цикл: ${formatMeters(nextCycleM)}`}
          />
        ) : null}
        <div className="h-full flex-1" />
      </div>

      <div className={cn(AppTypography.caption, "grid grid-cols-3 gap-2")}>
        <LegendItem swatch="bg-primary" label="Использовано" value={formatMeters(used)} />
        <LegendItem
          swatch="bg-accent"
          label={fitsNextCycle ? "Следующий цикл" : "Хвост"}
          value={formatMeters(nextCycleM)}
        />
        <LegendItem
          swatch="bg-muted-foreground/40"
          label="Остаток"
          value={formatMeters(remaining)}
          hint={`${Math.round(remainingPct)}%`}
        />
      </div>

      {plan.shortage_rolls > 0 ? (
        <div className={cn(AppTypography.caption, "text-destructive")}>
          Джамбы не хватает на заказ: недостаёт {formatMeters(plan.shortage_length_m)} ({plan.shortage_cycles}{" "}
          цикл.).
        </div>
      ) : null}
    </div>
  );
}

function LegendItem({
  swatch,
  label,
  value,
  hint,
}: {
  swatch: string;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", swatch)} />
      <span className="min-w-0">
        <span className="block truncate text-muted-foreground">{label}</span>
        <span className="block font-semibold text-foreground tabular-nums">
          {value}
          {hint ? <span className="ml-1 font-normal text-muted-foreground">· {hint}</span> : null}
        </span>
      </span>
    </div>
  );
}
