import type { ReactNode } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import type { StatusColorRole } from "@/models";
import { AppCardStyle, AppTypography } from "@/designsystem";
import { StatusBadge } from "./StatusBadge";

interface ReportCardProps {
  title: string;
  subtitle: string;
  statusLabel: string;
  statusTone: StatusColorRole;
  /** Trailing action (e.g. re-send button). */
  trailing?: ReactNode;
  href?: string;
}

/**
 * ReportCard — a generated document / report summary card.
 *
 * Purpose: unify the reports and documents lists into one Card-First style with
 * a status badge and optional trailing action. Usage:
 * `<ReportCard title="Отчёт" subtitle="31.07 · 42 КБ" statusLabel="Отправлен"
 *   statusTone="neutral" trailing={<ResendButton/>} href={…} />`. Limits:
 * display-only. Depends on: Design System card/typography tokens, StatusBadge.
 */
export function ReportCard({ title, subtitle, statusLabel, statusTone, trailing, href }: ReportCardProps) {
  const danger = statusTone === "danger";
  return (
    <div className={cn(AppCardStyle.surface, "flex items-center gap-3 border-l-4", danger ? "border-l-destructive" : "border-l-transparent")}>
      {href ? (
        <Link href={href} className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn(AppTypography.headline, "truncate")}>{title}</span>
            <StatusBadge label={statusLabel} tone={statusTone} />
          </div>
          <div className={cn(AppTypography.footnote, "truncate text-muted-foreground")}>{subtitle}</div>
        </Link>
      ) : (
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn(AppTypography.headline, "truncate")}>{title}</span>
            <StatusBadge label={statusLabel} tone={statusTone} />
          </div>
          <div className={cn(AppTypography.footnote, "truncate text-muted-foreground")}>{subtitle}</div>
        </div>
      )}
      {trailing}
    </div>
  );
}
