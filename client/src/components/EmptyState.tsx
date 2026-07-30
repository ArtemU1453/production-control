import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "@/resources/icons";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  message?: string;
  action?: ReactNode;
  className?: string;
}

/** Consistent placeholder for empty lists and not-yet-implemented sections. */
export function EmptyState({ icon: Icon, title, message, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Icon className="h-6 w-6" />
        </div>
      ) : null}
      <div className="space-y-1">
        <div className="text-sm font-semibold">{title}</div>
        {message ? (
          <div className="mx-auto max-w-xs text-sm text-muted-foreground">{message}</div>
        ) : null}
      </div>
      {action}
    </div>
  );
}
