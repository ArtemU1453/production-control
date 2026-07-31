import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ResponsiveGridProps {
  children: ReactNode;
  /** Minimum comfortable card width in px. Columns fill the available width and
   *  never exceed it (1 col on mobile → many on desktop), automatically. */
  min?: number;
  className?: string;
}

/**
 * ResponsiveGrid — the universal auto-fitting card grid.
 *
 * Uses `repeat(auto-fill, minmax(min(<min>px, 100%), 1fr))` so cards reflow from
 * a single mobile column up to 4–6 desktop columns purely from the container
 * width — no breakpoint bookkeeping, and the `min(<min>px, 100%)` guard means it
 * can never cause horizontal overflow. Part of the unified layout system.
 */
export function ResponsiveGrid({ children, min = 240, className }: ResponsiveGridProps) {
  const style: CSSProperties = {
    gridTemplateColumns: `repeat(auto-fill, minmax(min(${min}px, 100%), 1fr))`,
  };
  return (
    <div className={cn("grid gap-3 sm:gap-4", className)} style={style}>
      {children}
    </div>
  );
}
