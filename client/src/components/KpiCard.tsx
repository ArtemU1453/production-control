import { cn } from "@/lib/utils";
import { AppCardStyle, type LucideIcon } from "@/designsystem";
import { AppTypography } from "@/designsystem";
import { MiniChart } from "./MiniChart";

interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  icon?: LucideIcon;
  /** Signed change vs the previous period, in percent. */
  deltaPercent?: number;
  /** Optional sparkline series. */
  trend?: number[];
  className?: string;
}

/**
 * KpiCard — a headline production metric.
 *
 * Purpose: present a single KPI (orders, rolls, efficiency…) with an optional
 * period-over-period delta and sparkline. Usage:
 * `<KpiCard label="Заказы" value="128" deltaPercent={12} trend={series} />`.
 * Limits: display-only — the caller formats the value and computes the delta.
 * Depends on: Design System card/typography tokens and MiniChart.
 */
export function KpiCard({ label, value, unit, icon: Icon, deltaPercent, trend, className }: KpiCardProps) {
  const up = (deltaPercent ?? 0) >= 0;
  return (
    <div className={cn(AppCardStyle.surface, className)}>
      <div className="flex items-start justify-between gap-2">
        <span className={cn(AppTypography.footnote, "text-muted-foreground")}>{label}</span>
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={AppTypography.title2}>{value}</span>
        {unit ? <span className={cn(AppTypography.footnote, "text-muted-foreground")}>{unit}</span> : null}
      </div>
      {deltaPercent !== undefined ? (
        <div className={cn(AppTypography.caption, "mt-1", up ? "text-[hsl(142_71%_40%)]" : "text-destructive")}>
          {up ? "▲" : "▼"} {Math.abs(deltaPercent)}%
        </div>
      ) : null}
      {trend && trend.length >= 2 ? <MiniChart values={trend} className="mt-2" /> : null}
    </div>
  );
}
