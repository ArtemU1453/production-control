import {
  Calculator,
  Printer,
  RotateCcw,
  Save,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalcResult } from "@/services";
import { AppTypography } from "@/designsystem";
import { PrimaryButton, SecondaryButton, GhostButton } from "@/components";

interface InfoPanelsProps {
  plan: CalcResult | null;
  errorMsg: string | null;
  onCalculate: () => void;
  onClear: () => void;
  onSave: () => void;
  onPdf: () => void;
}

/**
 * InfoPanels — the calculator's compact action bar.
 *
 * A single row: the current status on the left, the primary actions on the
 * right (Рассчитать / Сохранить / PDF / Очистить). The detailed figures that
 * once lived here are shown once — in the cutting scheme, the KPI cards and the
 * results table — so nothing is duplicated. Display-only over the engine result.
 */
export function InfoPanels({
  plan,
  errorMsg,
  onCalculate,
  onClear,
  onSave,
  onPdf,
}: InfoPanelsProps) {
  const statusLabel = !plan
    ? "Введите параметры и выполните расчёт"
    : plan.shortage_rolls > 0
      ? "Нехватка материала"
      : "Готово к производству";
  const statusTone = !plan ? "warning" : plan.shortage_rolls > 0 ? "danger" : "ok";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div
        className={cn(
          AppTypography.footnote,
          "flex items-center gap-2",
          statusTone === "danger" && "text-destructive",
          statusTone === "warning" && "text-[hsl(38_92%_40%)] dark:text-[hsl(38_92%_60%)]",
          statusTone === "ok" && "text-[hsl(142_71%_40%)]",
        )}
      >
        {statusTone !== "ok" ? <TriangleAlert className="h-4 w-4" aria-hidden /> : null}
        {errorMsg ?? statusLabel}
      </div>

      <div data-no-print className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
        <PrimaryButton icon={Calculator} onClick={onCalculate} className="col-span-2 sm:col-span-1">
          Рассчитать
        </PrimaryButton>
        <SecondaryButton icon={Save} onClick={onSave} disabled={!plan}>
          Сохранить
        </SecondaryButton>
        <GhostButton icon={Printer} onClick={onPdf} disabled={!plan}>
          PDF
        </GhostButton>
        <GhostButton icon={RotateCcw} onClick={onClear}>
          Очистить
        </GhostButton>
      </div>
    </div>
  );
}
