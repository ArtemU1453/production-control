import type { ReactNode } from "react";
import {
  Calculator,
  ClipboardList,
  Gauge,
  Package,
  Printer,
  RotateCcw,
  Save,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalcResult } from "@/services";
import { AppCardStyle, AppTypography } from "@/designsystem";
import { PrimaryButton, SecondaryButton, GhostButton } from "@/components";
import { formatMeters, formatMm, formatPercent } from "@/extensions/number";
import type { CalculatorFormValues } from "@/viewmodels/calculatorSchema";
import type { CuttingModel } from "./cuttingModel";

interface InfoPanelsProps {
  values: CalculatorFormValues;
  plan: CalcResult | null;
  model: CuttingModel | null;
  errorMsg: string | null;
  onCalculate: () => void;
  onClear: () => void;
  onSave: () => void;
  onPdf: () => void;
}

/**
 * InfoPanels — the top information band ("верхняя информационная панель").
 *
 * Three at-a-glance cards (material/Jumbo, order, result) plus the primary
 * action bar. Cards lay out horizontally on desktop, two-up on tablet and stack
 * on mobile. Display-only: it reflects the form values and the engine result.
 */
export function InfoPanels({
  values,
  plan,
  model,
  errorMsg,
  onCalculate,
  onClear,
  onSave,
  onPdf,
}: InfoPanelsProps) {
  const yieldPercent =
    plan && plan.total_area_m2 > 0 ? (plan.useful_area_m2 / plan.total_area_m2) * 100 : null;
  // Placeholder shown while inputs are being edited and no valid plan exists.
  const DASH = "—";
  // Mode reflects operator intent (a boolean check — safe on any raw value).
  const mode = values.additionalWidthMm ? "Фиксированный доп." : "Авто-оптимизация";

  const statusLabel = !plan
    ? "Проверьте ввод"
    : plan.shortage_rolls > 0
      ? "Нехватка материала"
      : "Готово к производству";
  const statusTone = !plan ? "warning" : plan.shortage_rolls > 0 ? "danger" : "ok";

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard icon={Package} title="Материал / Джамба">
          <Row label="Ширина" value={plan ? formatMm(plan.material_width_mm) : DASH} />
          <Row label="Полезная" value={plan ? formatMm(plan.useful_width_mm) : DASH} />
          <Row label="Намотка" value={plan ? formatMeters(plan.big_roll_length_m) : DASH} />
          <Row label="Остаток" value={plan ? formatMeters(plan.remaining_jumbo_m) : DASH} />
        </InfoCard>

        <InfoCard icon={ClipboardList} title="Заказ">
          <Row label="Размер рулона" value={plan ? formatMm(plan.roll_width_mm) : DASH} />
          <Row label="Длина рулона" value={plan ? formatMeters(plan.roll_length_m) : DASH} />
          <Row label="Количество" value={plan ? `${plan.order_rolls} шт.` : DASH} />
          <Row label="Режим" value={mode} />
        </InfoCard>

        <InfoCard icon={Gauge} title="Результат">
          <Row label="Выход" value={yieldPercent !== null ? formatPercent(yieldPercent) : "—"} />
          <Row
            label="Отход"
            value={plan ? formatPercent(plan.waste_percent) : "—"}
            tone={plan && plan.waste_percent > 7 ? "danger" : undefined}
          />
          <Row label="Ножей / циклов" value={model ? `${model.knifeCount} / ${plan?.cycles_used ?? 0}` : "—"} />
          <Row label="Рулонов" value={plan ? `${plan.total_rolls} шт.` : "—"} />
        </InfoCard>
      </div>

      {/* Status + actions. */}
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
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={AppCardStyle.surface}>
      <div className={cn(AppTypography.caption2, "mb-2 flex items-center gap-1.5 text-muted-foreground")}>
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {title}
      </div>
      <dl className="space-y-1.5">{children}</dl>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className={cn(AppTypography.caption, "shrink-0 text-muted-foreground")}>{label}</dt>
      <dd
        className={cn(
          AppTypography.subheadline,
          "min-w-0 break-words text-right tabular-nums",
          tone === "danger" ? "text-destructive" : "text-foreground",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
