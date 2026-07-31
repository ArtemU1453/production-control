import { cn } from "@/lib/utils";
import { AppCharts } from "@/designsystem";

interface MiniChartProps {
  /** Series values; rendered as a normalised sparkline. */
  values: number[];
  color?: string;
  className?: string;
  "aria-label"?: string;
}

/**
 * MiniChart — a compact sparkline.
 *
 * Purpose: show a trend inline on cards without a full chart. Usage:
 * `<MiniChart values={trend} />`. Limits: purely decorative trend (no axes /
 * tooltips); needs ≥2 points to draw a line. Depends on: Design System chart
 * tokens (height, palette).
 */
export function MiniChart({ values, color = AppCharts.palette[0], className, ...aria }: MiniChartProps) {
  const height = AppCharts.miniHeight;
  const width = 120;
  const points = values.length >= 2 ? values : [...values, ...values];
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const path = points
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(height - ((v - min) / span) * height).toFixed(1)}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("w-full", className)}
      style={{ height }}
      role="img"
      aria-label={aria["aria-label"] ?? "Динамика"}
    >
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
