import { useCallback, useMemo, useRef, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { CardView, ScreenScaffold } from "@/components";
import { cn } from "@/lib/utils";
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import { AppTypography } from "@/designsystem";
import { haptics } from "@/designsystem/haptics";
import { useToast } from "@/hooks/use-toast";
import { useCalculatorViewModel } from "@/viewmodels";
import { calculatorDefaults } from "@/viewmodels/calculatorSchema";
import {
  buildCuttingModel,
  CuttingVisualizer,
  InfoPanels,
  KpiPanel,
  ResultTable,
  type CalcSessionEntry,
  type StripeKind,
} from "./calculator";

const INPUT_CLASS = "rounded-xl";

/**
 * CalculatorView — the operator's cutting-plan tool.
 *
 * A compact, workflow-first console: parameters on the left, and — once real
 * inputs are entered — the cutting scheme, the key result cards and the results
 * table on the right. It is a pure presentation layer over
 * {@link useCalculatorViewModel}; the plan comes from the unchanged Calculation
 * Engine and every panel here only *renders* that result. All inputs start empty
 * (no demo values), so nothing is computed or shown until the operator fills the
 * form. The analytics dashboard and the duplicate length gauge were removed to
 * keep the screen a tool, not a dashboard.
 */
export function CalculatorView() {
  const { form, plan, errorMsg, applyAdditionalWidth } = useCalculatorViewModel();
  const { toast } = useToast();

  const values = form.watch();
  const samplesMode = form.watch("samplesMode") ?? false;
  const model = useMemo(() => (plan ? buildCuttingModel(plan) : null), [plan]);

  const [activeKind, setActiveKind] = useState<StripeKind | null>(null);
  const [entries, setEntries] = useState<CalcSessionEntry[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);

  const revealResult = useCallback(() => {
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const onCalculate = useCallback(() => {
    void form.trigger();
    if (plan) {
      haptics.success();
      revealResult();
    } else {
      haptics.warning();
    }
  }, [form, plan, revealResult]);

  const onClear = useCallback(() => {
    form.reset(calculatorDefaults);
    setActiveKind(null);
    haptics.selection();
  }, [form]);

  const onSave = useCallback(() => {
    if (!plan) {
      return;
    }
    const entry: CalcSessionEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: Date.now(),
      values: { ...values },
      summary: {
        materialWidthMm: plan.material_width_mm,
        rollWidthMm: plan.roll_width_mm,
        rollLengthM: plan.roll_length_m,
        orderRolls: plan.order_rolls,
        wastePercent: plan.waste_percent,
        totalRolls: plan.total_rolls,
        remainingJumboM: plan.remaining_jumbo_m,
      },
    };
    setEntries((prev) => [entry, ...prev].slice(0, 8));
    haptics.success();
    toast({ title: "Сохранено", description: "Расчёт добавлен в историю сессии." });
  }, [plan, values, toast]);

  const onPdf = useCallback(() => {
    if (!plan) {
      return;
    }
    haptics.selection();
    window.print();
  }, [plan]);

  const recommended = plan?.optimal_additional_rolls?.[0];

  return (
    <ScreenScaffold
      title={strings.calculator.title}
      subtitle="Производственный расчёт раскроя Джамбы"
      wide
    >
      <div className="space-y-4">
        {/* Status + primary actions (Рассчитать / Сохранить / PDF / Очистить). */}
        <InfoPanels
          plan={plan}
          errorMsg={errorMsg}
          onCalculate={onCalculate}
          onClear={onClear}
          onSave={onSave}
          onPdf={onPdf}
        />

        <div className="grid gap-4 xl:grid-cols-12">
          {/* ── Input rail ─────────────────────────────────────────────── */}
          <aside
            data-no-print
            className="order-1 min-w-0 xl:col-span-4 xl:sticky xl:top-4 xl:self-start"
          >
            <CardView title="Параметры" icon={icons.cut} animate>
              <Form {...form}>
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                  <div className={cn(AppTypography.caption2, "text-muted-foreground")}>Материал</div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="materialWidthMm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Ширина Джамбо, мм</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              inputMode="numeric"
                              type="number"
                              className={INPUT_CLASS}
                              placeholder="Введите ширину"
                            />
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
                          <FormLabel className="text-xs">Намотка Джамба, м</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              inputMode="numeric"
                              type="number"
                              className={INPUT_CLASS}
                              placeholder="Введите намотку"
                            />
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
                        <FormLabel className="text-xs">Заказ, шт</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            inputMode="numeric"
                            type="number"
                            className={INPUT_CLASS}
                            placeholder="Введите количество"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Useful width is derived from material width; kept in the
                      form for validation but not user-editable. */}
                  <div className="hidden">
                    <FormField
                      control={form.control}
                      name="usefulWidthMm"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} value={field.value ?? ""} type="hidden" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  {/* «Образцы» mode — cut a list of sample widths in equal quantity. */}
                  <FormField
                    control={form.control}
                    name="samplesMode"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between gap-3 rounded-xl border border-card-border px-3 py-2">
                        <div className="min-w-0">
                          <FormLabel className="text-xs">Образцы</FormLabel>
                          <div className={cn(AppTypography.caption2, "text-muted-foreground")}>
                            Равное количество каждого размера
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={Boolean(field.value)}
                            onCheckedChange={field.onChange}
                            aria-label="Режим образцов"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className={cn(AppTypography.caption2, "text-muted-foreground")}>Готовый рулон</div>
                  <div className={cn("grid gap-3", samplesMode ? "grid-cols-1" : "grid-cols-2")}>
                    {!samplesMode ? (
                      <FormField
                        control={form.control}
                        name="rollWidthMm"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Ширина, мм</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value ?? ""}
                                inputMode="decimal"
                                type="number"
                                step="0.1"
                                className={INPUT_CLASS}
                                placeholder="Введите ширину"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : null}
                    <FormField
                      control={form.control}
                      name="rollLengthM"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Длина, м</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              inputMode="numeric"
                              type="number"
                              className={INPUT_CLASS}
                              placeholder="Введите длину"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {samplesMode ? (
                    <FormField
                      control={form.control}
                      name="sampleWidths"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Ширины образцов (через запятую), мм</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              inputMode="decimal"
                              className={INPUT_CLASS}
                              placeholder="напр. 104, 60, 30"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="additionalWidthMm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Фиксированный доп. размер (опц.), мм</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              inputMode="decimal"
                              type="number"
                              step="0.1"
                              className={INPUT_CLASS}
                              placeholder="Автоматически"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </form>
              </Form>
            </CardView>
          </aside>

          {/* ── Main column: cutting scheme → key results → results table ── */}
          <div ref={resultRef} className="order-2 min-w-0 scroll-mt-4 space-y-4 xl:col-span-8">
            {plan && model ? (
              <>
                <CardView animate>
                  <CuttingVisualizer
                    model={model}
                    activeKind={activeKind}
                    onActiveKindChange={setActiveKind}
                  />
                  {recommended ? (
                    <div className="mt-4 rounded-2xl border border-orange-200/50 bg-orange-50/50 p-3 dark:border-orange-800/30 dark:bg-orange-900/10">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" aria-hidden />
                        <div className={AppTypography.footnote}>
                          <div className="font-semibold text-orange-700 dark:text-orange-400">
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
                  ) : null}
                </CardView>

                <KpiPanel plan={plan} model={model} />

                <CardView title="Таблица результатов" icon={icons.dashboard} animate>
                  <ResultTable
                    plan={plan}
                    model={model}
                    activeKind={activeKind}
                    onActiveKindChange={setActiveKind}
                  />
                </CardView>
              </>
            ) : (
              <CardView animate>
                <div className={cn(AppTypography.footnote, "py-10 text-center text-muted-foreground")}>
                  {errorMsg ?? "Введите параметры и выполните расчёт, чтобы увидеть схему раскроя и результаты."}
                </div>
              </CardView>
            )}
          </div>
        </div>
      </div>
    </ScreenScaffold>
  );
}
