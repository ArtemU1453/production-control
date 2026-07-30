import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "@/resources/icons";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}

/** A compact metric tile: icon + label, a prominent value and an optional hint. */
export function MetricCard({ label, value, hint, icon: Icon, className }: MetricCardProps) {
  return (
    <div className={cn("rounded-2xl border bg-card/70 p-3", className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {Icon ? <Icon className="h-4 w-4" /> : null}
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
