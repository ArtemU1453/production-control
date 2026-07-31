import { cn } from "@/lib/utils";
import type { StatusColorRole } from "@/models";
import { AppProgressStyle } from "@/designsystem";

interface ProgressBarProps {
  /** Progress value in percent (0…100). */
  value: number;
  /** Colour tone of the fill. */
  tone?: StatusColorRole;
  className?: string;
  "aria-label"?: string;
}

/**
 * ProgressBar — linear progress indicator.
 *
 * Purpose: show utilisation / completion (e.g. a Jumbo's used %). Usage:
 * `<ProgressBar value={usagePercent} tone="neutral" />`. Limits: value is
 * clamped to 0…100; presentational only. Depends on: Design System progress
 * tokens (grid-aligned height, tone-based fill).
 */
export function ProgressBar({ value, tone = "neutral", className, ...aria }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn(AppProgressStyle.track, className)}
      style={{ height: AppProgressStyle.height }}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={aria["aria-label"]}
    >
      <div
        className={cn(AppProgressStyle.fill, AppProgressStyle.fillTone(tone))}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
