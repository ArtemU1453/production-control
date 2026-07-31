import type { StatusColorRole } from "@/models";
import { AppMetrics } from "./AppMetrics";

/**
 * AppProgressStyle — linear and radial progress tokens. Track and fill share one
 * geometry (grid-aligned height from {@link AppMetrics}); the fill colour is
 * selected by tone so a Jumbo's utilisation bar reads consistently everywhere.
 */
const fillByTone: Record<StatusColorRole, string> = {
  neutral: "bg-primary",
  warning: "bg-[hsl(38_92%_50%)]",
  danger: "bg-destructive",
  muted: "bg-muted-foreground/40",
};

export const AppProgressStyle = {
  /** Track height (px) from the 8-point metrics. */
  height: AppMetrics.progressHeight,
  track: "w-full overflow-hidden rounded-full bg-secondary",
  fill: "h-full rounded-full transition-[width] duration-300",
  fillTone(tone: StatusColorRole): string {
    return fillByTone[tone];
  },
  ring: AppMetrics.ring,
} as const;
