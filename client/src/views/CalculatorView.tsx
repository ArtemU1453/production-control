import { Lightbulb } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  CardView,
  InfoRow,
  MetricCard,
  ScreenScaffold,
  StatusBadge,
} from "@/components";
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import { formatHours } from "@/extensions/number";
import { useCalculatorViewModel } from "@/viewmodels";
import { CuttingScheme } from "./calculator/CuttingScheme";

/** The free (standalone) cutting calculator. All computation flows through the
 *  ViewModel, which preserves the original engine behaviour exactly. Production
 *  runs that consume a Jumbo use the Production screen instead. */
export function CalculatorView() {
  const { form, plan, errorMsg, applyAdditionalWidth } = useCalculatorViewModel();

  const inputClass =
    "rounded-2xl bg-emerald-950/20 border-emerald-800/30 focus-visible:ring-emerald-500/30";

  return (
    <ScreenScaffold title={strings.calculator.title}>
      <div className="space-y-4">
        <CardView title={strings.calculator.materialSection} icon={icons.cut} animate>
          <Form {...form}>
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="materialWidthMm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ширина, мм</FormLabel>
                      <FormControl>
                        <Input {...field} inputMode="numeric" type="number" className={inputClass} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bigRollLengthM"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Намотка Джамба, м</FormLabel>
                      <FormControl>
                        <Input {...field} inputMode="numeric" type="number" className={inputClass} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="orderRolls"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Заказ, шт</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="numeric" type="number" className={inputClass} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Useful width is derived from material width; kept in the form
                  for validation but not user-editable. */}
              <div className="hidden">
                <FormField
                  control={form.control}
                  name="usefulWidthMm"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} type="hidden" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <Separator className="my-2" />

              <div className="text-sm font-semibold">{strings.calculator.rollSection}</div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="rollWidthMm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ширина, мм</FormLabel>
                      <FormControl>
                        <Input {...field} inputMode="decimal" type="number" step="0.1" className="rounded-2xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rollLengthM"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Длина, м</FormLabel>
                      <FormControl>
                        <Input {...field} inputMode="numeric" type="number" className="rounded-2xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="additionalWidthMm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Фиксированный доп. размер (опц.), мм</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        inputMode="decimal"
                        type="number"
                        step="0.1"
                        className="rounded-2xl"
                        placeholder="Автоматически"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardView>

        <CardView
          title={strings.calculator.results}
          icon={icons.dashboard}
          headerTone="accent"
          headerTrailing={
            plan ? (
              <StatusBadge
                label={`Отход: ${plan.waste_percent.toFixed(1)}%`}
                tone={plan.waste_percent > 7 ? "danger" : "neutral"}
              />
            ) : (
              <StatusBadge label="Ошибка" tone="danger" />
            )
          }
          animate
        >
          {errorMsg ? (
            <div className="text-sm text-destructive">{errorMsg}</div>
          ) : plan ? (
            <div className="space-y-4">
              <CuttingScheme plan={plan} />

              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  label="Ручьёв осн."
                  icon={icons.material}
                  value={plan.main_count}
                  hint={`Ширина: ${plan.roll_width_mm} мм`}
                />
                <MetricCard
                  label="Ручьёв доп."
                  icon={icons.material}
                  value={plan.additional_width_mm ? 1 : 0}
                  hint={
                    plan.additional_width_mm
                      ? `Ширина: ${plan.additional_width_mm} мм`
                      : "Нет доп. размера"
                  }
                />
              </div>

              {(() => {
                const recommended = plan.optimal_additional_rolls?.[0];
                if (!recommended) {
                  return null;
                }
                return (
                  <div className="rounded-xl border border-orange-200/50 bg-orange-50/50 p-3 dark:border-orange-800/30 dark:bg-orange-900/10">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="mt-0.5 h-4 w-4 text-orange-500" />
                      <div className="text-sm">
                        <div className="font-medium text-orange-700 dark:text-orange-400">
                          Оптимизация отхода
                        </div>
                        <div className="mt-1 text-orange-600/80 dark:text-orange-400/80">
                          Отход более 7%. Рекомендуемый доп. размер:{" "}
                          <button
                            type="button"
                            className="cursor-pointer font-bold underline decoration-dotted"
                            onClick={() => applyAdditionalWidth(recommended.width)}
                          >
                            {recommended.width} мм
                          </button>{" "}
                          ({recommended.count} шт.)
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-2">
                <InfoRow label="Всего рулонов осн.:" value={`${plan.total_main_rolls} шт.`} />
                <InfoRow
                  label="Излишек / Нехватка:"
                  value={
                    <span className="text-destructive">
                      {plan.surplus_main_rolls} / {plan.shortage_rolls}
                    </span>
                  }
                />
                <InfoRow label="Доп. рулонов:" value={`${plan.total_additional_rolls} шт.`} />
                <InfoRow
                  label="Отход на кромки (с 1 стороны):"
                  value={`${plan.waste_per_side_mm.toFixed(1)} мм`}
                />
                <InfoRow label="Циклов (прогонов):" value={plan.cycles_used} />
                <InfoRow label="Остаток Джамба:" value={`${plan.remaining_jumbo_m} м`} />
                {plan.shortage_rolls > 0 && (
                  <>
                    <InfoRow label="Не хватает циклов:" value={plan.shortage_cycles} danger />
                    <InfoRow label="Не хватает метров:" value={`${plan.shortage_length_m} м`} danger />
                  </>
                )}
                {plan.estimated_hours && (
                  <InfoRow label="Примерное время:" value={formatHours(plan.estimated_hours)} last />
                )}
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-muted-foreground">
              Введите корректные данные
            </div>
          )}
        </CardView>
      </div>
    </ScreenScaffold>
  );
}
