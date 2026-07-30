import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InfoRowProps {
  label: string;
  value: ReactNode;
  /** Emphasise the value in the destructive colour. */
  danger?: boolean;
  /** Drop the bottom divider (e.g. last row). */
  last?: boolean;
  className?: string;
}

/** A label/value row used to present result and detail lists consistently. */
export function InfoRow({ label, value, danger = false, last = false, className }: InfoRowProps) {
  return (
    <div
      className={cn(
        "flex justify-between gap-3 text-sm",
        last ? "pt-1" : "border-b border-border/50 pb-1",
        danger && "text-destructive",
        className,
      )}
    >
      <span className={cn("text-muted-foreground", danger && "text-destructive/80")}>
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
