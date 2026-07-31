import { cn } from "@/lib/utils";
import { AppRadius } from "@/designsystem";

interface LoadingSkeletonProps {
  /** Shape of the placeholder. */
  variant?: "card" | "row" | "text";
  /** How many placeholders to render. */
  count?: number;
  className?: string;
}

const shapes: Record<NonNullable<LoadingSkeletonProps["variant"]>, string> = {
  card: `h-28 ${AppRadius.role.card}`,
  row: `h-16 ${AppRadius.role.card}`,
  text: "h-4 rounded-md",
};

/**
 * LoadingSkeleton — shimmer placeholders shown while data loads.
 *
 * Purpose: preserve layout and perceived performance instead of a spinner.
 * Usage: `<LoadingSkeleton variant="card" count={3} />`. Limits: presentational;
 * honours Reduce Motion via the shared pulse animation. Depends on: Design
 * System radius token.
 */
export function LoadingSkeleton({ variant = "card", count = 3, className }: LoadingSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cn("animate-pulse bg-muted/60", shapes[variant])} />
      ))}
    </div>
  );
}
