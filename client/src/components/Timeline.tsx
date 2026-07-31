import { cn } from "@/lib/utils";
import type { StatusColorRole } from "@/models";
import { AppTypography, type LucideIcon } from "@/designsystem";

export interface TimelineItem {
  id: string;
  title: string;
  subtitle?: string;
  timestamp?: string;
  icon?: LucideIcon;
  tone?: StatusColorRole;
}

interface TimelineProps {
  items: TimelineItem[];
}

const dotColor: Record<StatusColorRole, string> = {
  neutral: "bg-primary",
  warning: "bg-[hsl(38_92%_50%)]",
  danger: "bg-destructive",
  muted: "bg-muted-foreground",
};

/**
 * Timeline — a vertical event timeline.
 *
 * Purpose: render a Jumbo's operation journal (or any chronological log) with a
 * connector line, coloured dots and optional icons. Usage:
 * `<Timeline items={operations.map(toTimelineItem)} />`. Limits: display-only;
 * the caller maps domain events to {@link TimelineItem}. Depends on: Design
 * System typography tokens.
 */
export function Timeline({ items }: TimelineProps) {
  return (
    <ol className="relative space-y-4">
      {items.map((item, index) => {
        const Icon = item.icon;
        const last = index === items.length - 1;
        return (
          <li key={item.id} className="relative flex gap-3 pl-1">
            {!last ? <span aria-hidden="true" className="absolute left-[9px] top-5 bottom-[-1rem] w-px bg-border" /> : null}
            <span
              aria-hidden="true"
              className={cn(
                "relative z-10 mt-1 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10px] text-primary-foreground",
                dotColor[item.tone ?? "neutral"],
              )}
            >
              {Icon ? <Icon className="h-2.5 w-2.5" /> : null}
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className={cn(AppTypography.subheadline, "truncate")}>{item.title}</span>
                {item.timestamp ? <span className={cn(AppTypography.caption, "shrink-0 text-muted-foreground")}>{item.timestamp}</span> : null}
              </div>
              {item.subtitle ? <div className={cn(AppTypography.footnote, "truncate text-muted-foreground")}>{item.subtitle}</div> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
