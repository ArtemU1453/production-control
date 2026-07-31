import { History, RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppTypography } from "@/designsystem";
import { GhostButton } from "@/components";
import { formatMeters, formatMm, formatPercent } from "@/extensions/number";
import type { CalculatorFormValues } from "@/viewmodels/calculatorSchema";

/**
 * A single saved calculation, held only in memory for the current session.
 *
 * The standalone calculator intentionally does not persist: production history
 * is written by the Production/Warehouse flow. This is a convenience list so an
 * operator can compare a few "what-if" runs and re-apply their inputs — it never
 * touches a service, a model, or storage.
 */
export interface CalcSessionEntry {
  id: string;
  at: number;
  values: CalculatorFormValues;
  summary: {
    materialWidthMm: number;
    rollWidthMm: number;
    rollLengthM: number;
    orderRolls: number;
    wastePercent: number;
    totalRolls: number;
    remainingJumboM: number;
  };
}

interface SessionHistoryProps {
  entries: CalcSessionEntry[];
  onRepeat: (values: CalculatorFormValues) => void;
  onClear: () => void;
  className?: string;
}

const timeFmt = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" });

/**
 * SessionHistory — the recent-calculations list ("история расчётов"), scoped to
 * the session. Each row can be replayed back into the form.
 */
export function SessionHistory({ entries, onRepeat, onClear, className }: SessionHistoryProps) {
  if (entries.length === 0) {
    return (
      <div className={cn(AppTypography.footnote, "flex items-center gap-2 text-muted-foreground", className)}>
        <History className="h-4 w-4" aria-hidden />
        Сохранённые расчёты появятся здесь (в течение текущей сессии).
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className={cn(AppTypography.caption2, "text-muted-foreground")}>
          {entries.length} расчёт(ов) · сессия
        </span>
        <GhostButton icon={Trash2} onClick={onClear} className="h-7 px-2 text-xs">
          Очистить
        </GhostButton>
      </div>

      <ul className="space-y-2">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="flex items-center gap-3 rounded-2xl border border-card-border bg-card/40 p-3"
          >
            <div className="min-w-0 flex-1">
              <div className={cn(AppTypography.footnote, "font-medium")}>
                {formatMm(entry.summary.materialWidthMm)} · рулон {formatMm(entry.summary.rollWidthMm)} ×{" "}
                {formatMeters(entry.summary.rollLengthM)}
              </div>
              <div className={cn(AppTypography.caption, "mt-0.5 flex flex-wrap gap-x-3 text-muted-foreground")}>
                <span>{timeFmt.format(entry.at)}</span>
                <span>Заказ: {entry.summary.orderRolls} шт.</span>
                <span>Выход-отход: {formatPercent(entry.summary.wastePercent)}</span>
                <span>Остаток: {formatMeters(entry.summary.remainingJumboM)}</span>
              </div>
            </div>
            <GhostButton
              icon={RotateCcw}
              onClick={() => onRepeat(entry.values)}
              className="h-8 shrink-0 px-2 text-xs"
            >
              Повторить
            </GhostButton>
          </li>
        ))}
      </ul>
    </div>
  );
}
