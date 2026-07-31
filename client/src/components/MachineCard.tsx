import { cn } from "@/lib/utils";
import { AppCardStyle, AppIcons, AppTypography } from "@/designsystem";
import { ProgressBar } from "./ProgressBar";

interface MachineCardProps {
  name: string;
  ordersLabel: string;
  /** Load share in percent (0…100). */
  sharePercent: number;
  detail?: string;
}

/**
 * MachineCard — a machine load / productivity card.
 *
 * Purpose: show per-machine order share on dashboards and analytics. Usage:
 * `<MachineCard name="Станок №1" ordersLabel="128 зак." sharePercent={64} />`.
 * Limits: display-only. Depends on: Design System card/typography tokens,
 * ProgressBar, AppIcons.
 */
export function MachineCard({ name, ordersLabel, sharePercent, detail }: MachineCardProps) {
  const Icon = AppIcons.gauge;
  return (
    <div className={AppCardStyle.surface}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className={AppTypography.headline}>{name}</span>
        </div>
        <span className={cn(AppTypography.footnote, "text-muted-foreground")}>{ordersLabel}</span>
      </div>
      <ProgressBar className="mt-3" value={sharePercent} aria-label={`Загрузка ${name}`} />
      {detail ? <div className={cn(AppTypography.caption, "mt-2 text-muted-foreground")}>{detail}</div> : null}
    </div>
  );
}
