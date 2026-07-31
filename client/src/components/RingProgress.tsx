import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { StatusColorRole } from "@/models";
import { AppColors, AppProgressStyle, hsl } from "@/designsystem";

interface RingProgressProps {
  /** Progress value in percent (0…100). */
  value: number;
  tone?: StatusColorRole;
  /** Content rendered in the centre (e.g. the percentage label). */
  children?: ReactNode;
  className?: string;
  "aria-label"?: string;
}

const toneColor: Record<StatusColorRole, string> = {
  neutral: "hsl(var(--primary))",
  warning: hsl(AppColors.status.warning),
  danger: hsl(AppColors.status.danger),
  muted: "hsl(var(--muted-foreground))",
};

/**
 * RingProgress — radial (ring) progress indicator.
 *
 * Purpose: headline efficiency / utilisation figures on the Jumbo card and
 * analytics. Usage: `<RingProgress value={eff}>{eff}%</RingProgress>`. Limits:
 * value clamped to 0…100; size/stroke come from Design System metrics. Depends
 * on: Design System progress + colour tokens.
 */
export function RingProgress({ value, tone = "neutral", children, className, ...aria }: RingProgressProps) {
  const { size, stroke } = AppProgressStyle.ring;
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={aria["aria-label"]}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--secondary))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={toneColor[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-center">{children}</div>
    </div>
  );
}
