import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppCardStyle, AppColors, AppMetrics, AppTypography, hsl } from "@/designsystem";

interface ArchiveCardProps {
  stockNumber: string;
  materialCode: string;
  /** Final efficiency in percent. */
  efficiencyPercent: number;
  lossesLabel: string;
  archivedLabel: string;
  href?: string;
}

/**
 * ArchiveCard — a closed (archived) Jumbo summary card.
 *
 * Purpose: Card-First archive list with a graphite status bar and final KPIs.
 * Usage: `<ArchiveCard stockNumber="A-12" materialCode="MAT01"
 *   efficiencyPercent={91} lossesLabel="15 м²" archivedLabel="01.02.2026" />`.
 * Limits: display-only; the caller formats fields. Depends on: Design System
 * card/colour/metrics tokens.
 */
export function ArchiveCard({
  stockNumber,
  materialCode,
  efficiencyPercent,
  lossesLabel,
  archivedLabel,
  href,
}: ArchiveCardProps) {
  const body = (
    <div className={cn(AppCardStyle.surface, href && AppCardStyle.interactive, "relative overflow-hidden pl-5")}>
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 rounded-l-3xl"
        style={{ width: AppMetrics.statusBarWidth, background: hsl(AppColors.jumboStatus.archive) }}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={cn(AppTypography.headline, "truncate")}>Архив №{stockNumber}</div>
          <div className={cn(AppTypography.footnote, "text-muted-foreground")}>{materialCode}</div>
        </div>
        {href ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
      </div>
      <div className={cn(AppTypography.caption, "mt-2 text-muted-foreground")}>
        Эффективность {Math.round(efficiencyPercent)}% · Потери {lossesLabel} · {archivedLabel}
      </div>
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
