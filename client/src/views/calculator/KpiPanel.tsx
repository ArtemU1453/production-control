import { motion } from "framer-motion";
import {
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
import { AppAnimation, AppTypography } from "@/designsystem";
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
 * A single compact grid of six metric cards (Рулонов всего / Ножей / Циклов /
 * Полезная площадь / Остаток Джамбы / Брак-отход). Every value is read verbatim
 * from the engine result — the panel adds no production math. The former hero
 * utilisation card (yield ring + length gauge) was removed to keep the «Расчёт»
 * screen dense; the same figures still come from the engine for other screens.
 */
export function KpiPanel({ plan, model, className }: KpiPanelProps) {
  const wasteTone: StatusColorRole = plan.waste_percent > 7 ? "danger" : "neutral";

  const tiles: Tile[] = [
    { key: "rolls", label: "Рулонов всего", value: `${plan.total_rolls}`, icon: Package, tone: "neutral" },
    { key: "knives", label: "Ножей", value: `${model.knifeCount}`, icon: Scissors, tone: "neutral" },
    { key: "cycles", label: "Циклов", value: `${plan.cycles_used}`, icon: Repeat, tone: "neutral" },
    { key: "useful", label: "Полезная площадь", value: formatArea(plan.useful_area_m2), icon: Layers, tone: "neutral" },
    { key: "remain", label: "Остаток Джамбы", value: formatMeters(plan.remaining_jumbo_m), icon: Ruler, tone: plan.remaining_jumbo_m <= 0 ? "muted" : "neutral" },
    { key: "waste", label: "Брак / отход", value: formatPercent(plan.waste_percent), icon: TriangleAlert, tone: wasteTone },
  ];

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {tiles.map((tile, index) => {
        const Icon = tile.icon;
        return (
          <motion.div
            key={tile.key}
            initial={AppAnimation.itemEnter.initial}
            animate={AppAnimation.itemEnter.animate}
            transition={{ ...AppAnimation.transition.normal, delay: index * 0.03 }}
            className="rounded-xl border border-card-border bg-card/60 px-3 py-2"
          >
            <div className={cn(AppTypography.caption2, "flex items-center gap-1.5 truncate text-muted-foreground")}>
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{tile.label}</span>
            </div>
            <div className={cn(AppTypography.subheadline, "mt-0.5 font-semibold tabular-nums", toneText[tile.tone])}>
              {tile.value}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
