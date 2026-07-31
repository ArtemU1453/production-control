import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { StatusColorRole } from "@/models";
import { AppCardStyle, AppTypography, type LucideIcon } from "@/designsystem";

interface WarningCardProps {
  tone: StatusColorRole;
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Optional action (button / link). */
  action?: ReactNode;
}

const accent: Record<StatusColorRole, string> = {
  neutral: "border-l-primary",
  warning: "border-l-[hsl(38_92%_50%)]",
  danger: "border-l-destructive",
  muted: "border-l-muted-foreground",
};

const iconColor: Record<StatusColorRole, string> = {
  neutral: "text-primary",
  warning: "text-[hsl(38_92%_45%)]",
  danger: "text-destructive",
  muted: "text-muted-foreground",
};

/**
 * WarningCard — an alert / advisory card with a tone accent.
 *
 * Purpose: surface notifications and recommendations consistently (leading
 * coloured edge, optional icon and action). Usage:
 * `<WarningCard tone="danger" title="Низкий остаток" description="…"
 *   action={<GhostButton>Открыть</GhostButton>} />`. Limits: display-only.
 * Depends on: Design System card/typography tokens.
 */
export function WarningCard({ tone, title, description, icon: Icon, action }: WarningCardProps) {
  return (
    <div className={cn(AppCardStyle.surface, "border-l-4", accent[tone])}>
      <div className="flex items-start gap-3">
        {Icon ? <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconColor[tone])} /> : null}
        <div className="min-w-0 flex-1">
          <div className={AppTypography.headline}>{title}</div>
          {description ? <div className={cn(AppTypography.footnote, "mt-0.5 text-muted-foreground")}>{description}</div> : null}
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
