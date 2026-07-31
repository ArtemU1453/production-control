import { motion } from "framer-motion";
import {
  Gauge,
  Layers,
  Package,
  Repeat,
  Ruler,
  Scissors,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalcResult } from "@/services";
import type { StatusColorRole } from "@/models";
import { AppAnimation, AppCardStyle, AppTypography } from "@/designsystem";
import { ProgressBar, RingProgress } from "@/components";
import { formatArea, formatMeters, formatPercent } from "@/extensions/number";
import type { CuttingModel } from "./cuttingModel";

interface KpiPanelProps {
  plan: CalcResult;
  model: CuttingModel;
  className?: string;
}

interface Tile {
  key: string;
  label: string;
  value: string;
  icon: LucideIcon;
  tone: StatusColorRole;
}

const toneText: Record<StatusColorRole, string> = {
  neutral: "text-foreground",
  warning: "text-[hsl(38_92%_40%)] dark:text-[hsl(38_92%_60%)]",
  danger: "text-destructive",
  muted: "text-muted-foreground",
};

/**
 * KpiPanel — the headline production metrics ("панель KPI").
 *
 * A hero utilisation card (material used along the Jumbo length + a yield ring)
 * plus a responsive grid of secondary figures. Every value is read verbatim
 * from the engine result; the two derived numbers (length-used % and yield %)
 * are pure display ratios of engine outputs, not new production math.
 */
export function KpiPanel({ plan, model, className }: KpiPanelProps) {
  const usedPercent =
    plan.big_roll_length_m > 0
      ? Math.min(100, (plan.used_length_m / plan.big_roll_length_m) * 100)
      : 0;
  const yieldPercent =
    plan.total_area_m2 > 0 ? (plan.useful_area_m2 / plan.total_area_m2) * 100 : 0;

  const wasteTone: StatusColorRole = plan.waste_percent > 7 ? "danger" : "neutral";
  const yieldTone: StatusColorRole = yieldPercent >= 93 ? "neutral" : "warning";

  const tiles: Tile[] = [
    { key: "rolls", label: "Рулонов всего", value: `${plan.total_rolls}`, icon: Package, tone: "neutral" },
    { key: "knives", label: "Ножей", value: `${model.knifeCount}`, icon: Scissors, tone: "neutral" },
    { key: "cycles", label: "Циклов", value: `${plan.cycles_used}`, icon: Repeat, tone: "neutral" },
    { key: "useful", label: "Полезная площадь", value: formatArea(plan.useful_area_m2), icon: Layers, tone: "neutral" },
    { key: "remain", label: "Остаток Джамбы", value: formatMeters(plan.remaining_jumbo_m), icon: Ruler, tone: plan.remaining_jumbo_m <= 0 ? "muted" : "neutral" },
    { key: "waste", label: "Брак / отход", value: formatPercent(plan.waste_percent), icon: TriangleAlert, tone: wasteTone },
  ];

  return (
    <div className={cn("space-y-3", className)}>
      {/* Hero utilisation card. */}
      <div className={cn(AppCardStyle.surface, "flex items-center gap-4")}>
        <RingProgress
          value={yieldPercent}
          tone={yieldTone}
          aria-label={`Выход материала ${formatPercent(yieldPercent)}`}
        >
          <div className="leading-none">
            <div className={AppTypography.title2}>{Math.round(yieldPercent)}%</div>
            <div className={cn(AppTypography.caption2, "text-muted-foreground")}>выход</div>
          </div>
        </RingProgress>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className={cn(AppTypography.footnote, "flex items-center gap-1.5 text-muted-foreground")}>
              <Gauge className="h-4 w-4" aria-hidden /> Использовано материала
            </span>
            <span className={cn(AppTypography.subheadline, usedPercent >= 99 ? "text-[hsl(142_71%_40%)]" : "text-foreground")}>
              {formatPercent(usedPercent)}
            </span>
          </div>
          <ProgressBar
            value={usedPercent}
            tone="neutral"
            aria-label={`Использовано ${formatPercent(usedPercent)} длины Джамбы`}
          />
          <div className={cn(AppTypography.caption, "flex items-center justify-between text-muted-foreground")}>
            <span>Пройдено: {formatMeters(plan.used_length_m)}</span>
            <span>Остаток: {formatMeters(plan.remaining_jumbo_m)}</span>
          </div>
        </div>
      </div>

      {/* Secondary metric grid. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tiles.map((tile, index) => {
          const Icon = tile.icon;
          return (
            <motion.div
              key={tile.key}
              initial={AppAnimation.itemEnter.initial}
              animate={AppAnimation.itemEnter.animate}
              transition={{ ...AppAnimation.transition.normal, delay: index * 0.03 }}
              className={AppCardStyle.surface}
            >
              <div className={cn(AppTypography.caption, "flex items-center gap-1.5 text-muted-foreground")}>
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {tile.label}
              </div>
              <div className={cn(AppTypography.title2, "mt-1 tabular-nums", toneText[tile.tone])}>
                {tile.value}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
