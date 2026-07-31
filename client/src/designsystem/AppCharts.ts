import { AppColors, hsl } from "./AppColors";
import { AppMetrics } from "./AppMetrics";

/**
 * AppCharts — chart theming tokens. A single categorical palette (built from the
 * semantic and status colours) and shared dimensions keep every chart — KPI
 * rings, bar charts, sparklines — visually consistent in Light and Dark mode.
 */
export const AppCharts = {
  /** Categorical series palette. */
  palette: [
    "hsl(var(--primary))",
    "hsl(var(--accent))",
    hsl(AppColors.status.success),
    hsl(AppColors.status.warning),
    hsl(AppColors.status.danger),
    hsl(AppColors.status.info),
  ] as const,
  /** Semantic roles for outcome charts. */
  role: {
    useful: "hsl(var(--primary))",
    waste: hsl(AppColors.status.danger),
    scrap: hsl(AppColors.status.warning),
    grid: "hsl(var(--border))",
    axis: "hsl(var(--muted-foreground))",
  },
  height: AppMetrics.chartHeight,
  miniHeight: AppMetrics.miniChartHeight,
  ring: AppMetrics.ring,
} as const;
