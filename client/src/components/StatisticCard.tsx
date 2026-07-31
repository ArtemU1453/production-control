import { cn } from "@/lib/utils";
import type { StatusColorRole } from "@/models";
import { AppCardStyle, AppTypography } from "@/designsystem";

interface StatisticCardProps {
  label: string;
  value: string;
  tone?: StatusColorRole;
  className?: string;
}

const toneText: Record<StatusColorRole, string> = {
  neutral: "text-foreground",
  warning: "text-[hsl(38_92%_40%)] dark:text-[hsl(38_92%_60%)]",
  danger: "text-destructive",
  muted: "text-muted-foreground",
};

/**
 * StatisticCard — a compact single statistic tile.
 *
 * Purpose: dense grids of secondary figures (areas, losses, counts). Usage:
 * `<StatisticCard label="Брак" value="12 м²" tone="danger" />`. Limits:
 * display-only; the caller formats the value. Depends on: Design System
 * card/typography tokens.
 */
export function StatisticCard({ label, value, tone = "neutral", className }: StatisticCardProps) {
  return (
    <div className={cn(AppCardStyle.surface, className)}>
      <div className={cn(AppTypography.caption, "text-muted-foreground")}>{label}</div>
      <div className={cn(AppTypography.title2, "mt-1", toneText[tone])}>{value}</div>
    </div>
  );
}
