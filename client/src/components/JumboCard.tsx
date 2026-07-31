import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { JumboStatus, jumboStatusColorRole, jumboStatusTitle } from "@/models";
import { AppCardStyle, AppColors, AppMetrics, AppTypography, hsl } from "@/designsystem";
import { StatusBadge } from "./StatusBadge";
import { ProgressBar } from "./ProgressBar";

interface JumboCardProps {
  stockNumber: string;
  materialCode: string;
  /** Current remainder, formatted metres string (e.g. "1 240 м"). */
  remainderLabel: string;
  /** Utilisation in percent (0…100) for the progress bar. */
  usagePercent: number;
  status: JumboStatus;
  /** Last operation summary line, optional. */
  lastOperation?: string;
  href?: string;
  /** Override for the leading bar colour token (e.g. used → red). */
  barColorToken?: string;
}

/** Maps a Jumbo lifecycle status to its status-bar colour token. */
function barColorFor(status: JumboStatus): string {
  switch (status) {
    case JumboStatus.onStock:
      return AppColors.jumboStatus.onStock;
    case JumboStatus.inWork:
      return AppColors.jumboStatus.inWork;
    case JumboStatus.toWriteOff:
      return AppColors.jumboStatus.toWriteOff;
    case JumboStatus.archived:
      return AppColors.jumboStatus.archive;
  }
}

/**
 * JumboCard — Card-First representation of a warehouse Jumbo.
 *
 * Purpose: replace list rows on the warehouse screen with a rich card carrying a
 * leading status colour bar, material/stock number, remainder, utilisation
 * progress, status badge and last operation. Usage:
 * `<JumboCard stockNumber="A-12" materialCode="MAT01" remainderLabel="1 240 м"
 *   usagePercent={62} status={jumbo.status} href={…} />`. Limits: display-only;
 * the caller formats numbers and supplies navigation. Depends on: Design System
 * card/colour/metrics tokens, StatusBadge, ProgressBar, Jumbo status helpers.
 */
export function JumboCard({
  stockNumber,
  materialCode,
  remainderLabel,
  usagePercent,
  status,
  lastOperation,
  href,
  barColorToken,
}: JumboCardProps) {
  const body = (
    <div className={cn(AppCardStyle.surface, href && AppCardStyle.interactive, "relative overflow-hidden pl-5")}>
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 rounded-l-3xl"
        style={{ width: AppMetrics.statusBarWidth, background: hsl(barColorToken ?? barColorFor(status)) }}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={cn(AppTypography.headline, "truncate")}>Джамб №{stockNumber}</div>
          <div className={cn(AppTypography.footnote, "text-muted-foreground")}>{materialCode}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge label={jumboStatusTitle(status)} tone={jumboStatusColorRole(status)} />
          {href ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : null}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className={cn(AppTypography.body, "font-semibold")}>{remainderLabel}</span>
        <span className={cn(AppTypography.caption, "text-muted-foreground")}>{Math.round(usagePercent)}%</span>
      </div>
      <ProgressBar
        className="mt-1.5"
        value={usagePercent}
        tone={status === JumboStatus.toWriteOff ? "warning" : "neutral"}
        aria-label="Использование Джамба"
      />
      {lastOperation ? (
        <div className={cn(AppTypography.caption, "mt-2 truncate text-muted-foreground")}>{lastOperation}</div>
      ) : null}
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}
