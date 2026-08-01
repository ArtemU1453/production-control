import { useState } from "react";
import { Link } from "wouter";
import { AlertTriangle, ArrowRight, CheckCircle2, PackageSearch, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CardView,
  EmptyState,
  InfoRow,
  LoadingView,
  MetricCard,
  PrimaryButton,
  ScreenScaffold,
  SecondaryButton,
  SegmentedControl,
  StatusBadge,
  type SegmentOption,
} from "@/components";
import { useToast } from "@/hooks/use-toast";
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import {
  Machine,
  RollDestination,
  jumboStatusColorRole,
  jumboStatusTitle,
  machineOrder,
  machineTitle,
  type Jumbo,
} from "@/models";
import { formatArea, formatHours, formatMeters } from "@/extensions/number";
import { formatDate } from "@/extensions/date";
import { useProductionViewModel, type ChainStep, type OrderSummary } from "@/viewmodels";
import { CuttingScheme } from "./calculator/CuttingScheme";

const destinationOptions: ReadonlyArray<SegmentOption<RollDestination>> = [
  { value: RollDestination.order, label: "В заказ" },
  { value: RollDestination.warehouse, label: "На склад" },
];

function JumboPicker({
  jumbos,
  materialNameFor,
  onPick,
}: {
  jumbos: Jumbo[];
  materialNameFor: (jumbo: Jumbo) => string;
  onPick: (jumbo: Jumbo) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <SecondaryButton icon={PackageSearch} fullWidth>
          {strings.production.selectJumbo}
        </SecondaryButton>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{strings.production.availableTitle}</DialogTitle>
        </DialogHeader>
        {jumbos.length === 0 ? (
          <EmptyState
            icon={icons.warehouse}
            title={strings.production.noJumbos}
            message={strings.production.noJumbosHint}
            action={
              <Link href="/warehouse/receipt">
                <PrimaryButton icon={icons.boxes}>Поступление сырья</PrimaryButton>
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {jumbos.map((jumbo) => (
              <button
                key={jumbo.id}
                type="button"
                onClick={() => {
                  onPick(jumbo);
                  setOpen(false);
                }}
                className="w-full rounded-2xl border bg-card/60 p-3 text-left transition-colors hover:border-primary"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">
                    № {jumbo.stockNumber} · {jumbo.materialCode}
                  </span>
                  <StatusBadge
                    label={jumboStatusTitle(jumbo.status)}
                    tone={jumboStatusColorRole(jumbo.status)}
                  />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {materialNameFor(jumbo)} · {jumbo.widthMm} мм · Намотка:{" "}
                  {formatMeters(jumbo.initialWindingM)} · Остаток:{" "}
                  {formatMeters(jumbo.currentRemainderM)} · {formatDate(jumbo.arrivalDate)}
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Continuation picker: choose the next Jumbo to keep filling the same order. */
function ContinueOrderDialog({
  jumbos,
  materialNameFor,
  onContinue,
  continuing,
  disabled,
  producedThisJumbo,
  orderRolls,
}: {
  jumbos: Jumbo[];
  materialNameFor: (jumbo: Jumbo) => string;
  onContinue: (jumbo: Jumbo) => void;
  continuing: boolean;
  disabled: boolean;
  producedThisJumbo: number;
  orderRolls: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <PrimaryButton icon={Plus} fullWidth loading={continuing} disabled={disabled}>
          Продолжить на новом Джамбо
        </PrimaryButton>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Продолжение выполнения заказа</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Текущего Джамбо недостаточно для завершения заказа
          {producedThisJumbo > 0 ? ` (изготовлено ${producedThisJumbo} из ${orderRolls} рул.)` : ""}.
          Выберите следующий Джамбо, чтобы автоматически продолжить выполнение заказа.
        </p>
        {jumbos.length === 0 ? (
          <EmptyState
            icon={icons.warehouse}
            title="Нет доступных Джамбо"
            message="Все пригодные Джамбо уже задействованы. Оформите поступление сырья."
            action={
              <Link href="/warehouse/receipt">
                <PrimaryButton icon={icons.boxes}>Поступление сырья</PrimaryButton>
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {jumbos.map((jumbo) => (
              <button
                key={jumbo.id}
                type="button"
                disabled={continuing}
                onClick={() => {
                  onContinue(jumbo);
                  setOpen(false);
                }}
                className="w-full rounded-2xl border bg-card/60 p-3 text-left transition-colors hover:border-primary disabled:opacity-60"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">
                    № {jumbo.stockNumber} · {jumbo.materialCode}
                  </span>
                  <StatusBadge
                    label={jumboStatusTitle(jumbo.status)}
                    tone={jumboStatusColorRole(jumbo.status)}
                  />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {materialNameFor(jumbo)} · {jumbo.widthMm} мм · Остаток:{" "}
                  {formatMeters(jumbo.currentRemainderM)}
                  {jumbo.comment ? ` · ${jumbo.comment}` : ""}
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Live progress of a multi-Jumbo order while it is still running. */
function ChainProgressCard({
  steps,
  produced,
  total,
  remaining,
}: {
  steps: ChainStep[];
  produced: number;
  total: number | null;
  remaining: number | null;
}) {
  return (
    <CardView title="Цепочка выполнения заказа" icon={icons.history} animate>
      <div className="text-sm text-muted-foreground">
        Изготовлено <span className="font-semibold text-foreground">{produced}</span>
        {total !== null ? <> из <span className="font-semibold text-foreground">{total}</span></> : null} рул.
        {remaining !== null ? <> · осталось <span className="font-semibold text-foreground">{remaining}</span></> : null}
      </div>
      <ol className="mt-3 space-y-2">
        {steps.map((step, index) => (
          <li key={`${step.jumboStockNumber}-${index}`} className="flex items-center gap-3 rounded-2xl border bg-card/50 p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <div className="font-semibold">Джамбо № {step.jumboStockNumber}</div>
              <div className="text-xs text-muted-foreground">
                Изготовлено: {step.producedMainRolls} рул. · Остаток: {formatMeters(step.remainderAfterM)}
              </div>
            </div>
          </li>
        ))}
        <li className="flex items-center gap-3 rounded-2xl border border-dashed border-primary/40 p-3 text-sm text-primary">
          <ArrowRight className="h-4 w-4 shrink-0" />
          Следующий Джамбо — продолжение ниже
        </li>
      </ol>
    </CardView>
  );
}

/** Final roll-up shown once the whole order (any number of Jumbos) is done. */
function OrderSummaryCard({ summary, onNewOrder }: { summary: OrderSummary; onNewOrder: () => void }) {
  return (
    <CardView
      animate
      className="border-l-4 border-l-[hsl(142_71%_45%)]"
      title="Заказ выполнен"
      icon={icons.gauge}
      headerTrailing={<StatusBadge label={`Джамбо: ${summary.jumbosUsed}`} tone="neutral" />}
    >
      <div className="space-y-3">
        <div className="text-sm text-muted-foreground">
          Заказ № {summary.orderNumber || "—"}
          {summary.customer ? ` · ${summary.customer}` : ""}
        </div>

        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Использовано Джамбо
          </div>
          <ol className="space-y-2">
            {summary.steps.map((step, index) => (
              <li key={`${step.jumboStockNumber}-${index}`}>
                <div className="flex items-center gap-3 rounded-2xl border bg-card/50 p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="font-semibold">№ {step.jumboStockNumber}</div>
                    <div className="text-xs text-muted-foreground">
                      Изготовлено: {step.producedMainRolls} рул. · Остаток: {formatMeters(step.remainderAfterM)}
                    </div>
                  </div>
                </div>
                {index < summary.steps.length - 1 ? (
                  <div className="flex justify-center py-0.5 text-muted-foreground">↓</div>
                ) : null}
              </li>
            ))}
          </ol>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Всего изготовлено" value={`${summary.totalMainRolls} шт.`} hint={`Цель: ${summary.targetRolls} шт.`} />
          <MetricCard label="Использовано Джамбо" value={summary.jumbosUsed} />
          <MetricCard label="Общий расход" value={formatMeters(summary.totalConsumedM)} />
          <MetricCard label="Общий отход" value={formatArea(summary.totalWasteAreaM2)} />
        </div>

        <SecondaryButton fullWidth onClick={onNewOrder}>
          Новый заказ
        </SecondaryButton>
      </div>
    </CardView>
  );
}

export function ProductionView() {
  const vm = useProductionViewModel();
  const { toast } = useToast();

  const onContinue = async (jumbo: Jumbo) => {
    await vm.continueOnNewJumbo(jumbo);
    toast({ title: "Заказ продолжается на новом Джамбо" });
  };

  const materialNameFor = (jumbo: Jumbo) => vm.materialsById.get(jumbo.materialId)?.name ?? "—";

  const onExecute = async () => {
    const outcome = await vm.execute();
    if (outcome) {
      toast({
        title: strings.production.successNotice,
        description: outcome.becameWriteOff
          ? strings.production.writeOffNotice
          : outcome.firstUse
            ? strings.production.firstUseNotice
            : undefined,
      });
    }
  };

  return (
    <ScreenScaffold title={strings.production.title}>
      {vm.loading ? (
        <LoadingView />
      ) : (
        <div className="space-y-4">
          {vm.orderSummary ? (
            <OrderSummaryCard summary={vm.orderSummary} onNewOrder={vm.reset} />
          ) : vm.outcome ? (
            <CardView animate className={vm.outcome.becameWriteOff ? "border-l-4 border-l-destructive" : undefined}>
              <div className="flex items-start gap-2">
                {vm.outcome.becameWriteOff ? (
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-[hsl(142_71%_45%)]" />
                )}
                <div className="text-sm">
                  <div className="font-semibold">{strings.production.successNotice}</div>
                  <div className="mt-1 text-muted-foreground">
                    Остаток Джамба: {formatMeters(vm.outcome.remainderAfterM)}
                  </div>
                  {vm.outcome.becameWriteOff ? (
                    <div className="mt-1 text-destructive">{strings.production.writeOffNotice}</div>
                  ) : vm.outcome.firstUse ? (
                    <div className="mt-1 text-muted-foreground">{strings.production.firstUseNotice}</div>
                  ) : null}
                </div>
              </div>
            </CardView>
          ) : null}

          {vm.chainSteps.length > 0 && !vm.orderSummary ? (
            <ChainProgressCard
              steps={vm.chainSteps}
              produced={vm.producedMain}
              total={vm.orderTotalRolls}
              remaining={vm.remainingRolls}
            />
          ) : null}

          <CardView title={strings.production.orderInfo} icon={icons.reports} animate>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="order-date">Дата</Label>
                  <Input
                    id="order-date"
                    type="date"
                    className="rounded-2xl"
                    value={vm.order.date}
                    onChange={(e) => vm.updateOrder("date", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="order-time">Время</Label>
                  <Input
                    id="order-time"
                    type="time"
                    className="rounded-2xl"
                    value={vm.order.time}
                    onChange={(e) => vm.updateOrder("time", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="order-customer">Заказчик</Label>
                  <Input
                    id="order-customer"
                    className="rounded-2xl"
                    value={vm.order.customer}
                    onChange={(e) => vm.updateOrder("customer", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="order-number">Номер заказа</Label>
                  <Input
                    id="order-number"
                    className="rounded-2xl"
                    value={vm.order.orderNumber}
                    onChange={(e) => vm.updateOrder("orderNumber", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="order-operator">Оператор</Label>
                  <Input
                    id="order-operator"
                    className="rounded-2xl"
                    value={vm.order.operator}
                    onChange={(e) => vm.updateOrder("operator", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Станок</Label>
                  <Select
                    value={vm.order.machine}
                    onValueChange={(value) => vm.updateOrder("machine", value as Machine)}
                  >
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {machineOrder.map((machine) => (
                        <SelectItem key={machine} value={machine}>
                          {machineTitle(machine)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="order-comment">Комментарий</Label>
                <Textarea
                  id="order-comment"
                  className="rounded-2xl"
                  value={vm.order.comment ?? ""}
                  onChange={(e) => vm.updateOrder("comment", e.target.value)}
                  placeholder="Необязательно"
                />
              </div>
            </div>
          </CardView>

          <CardView title={strings.production.jumbo} icon={icons.jumbo} animate>
            {vm.selectedJumbo ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{strings.production.usedJumbo}</span>
                  <StatusBadge
                    label={jumboStatusTitle(vm.selectedJumbo.status)}
                    tone={jumboStatusColorRole(vm.selectedJumbo.status)}
                  />
                </div>
                <div className="space-y-2">
                  <InfoRow label="Номер складского учёта" value={vm.selectedJumbo.stockNumber} />
                  <InfoRow
                    label="Материал"
                    value={`${vm.selectedJumbo.materialCode} · ${materialNameFor(vm.selectedJumbo)}`}
                  />
                  <InfoRow label="Ширина" value={`${vm.selectedJumbo.widthMm} мм`} />
                  <InfoRow label="Начальная намотка" value={formatMeters(vm.selectedJumbo.initialWindingM)} />
                  <InfoRow label="Текущий остаток" value={formatMeters(vm.selectedJumbo.currentRemainderM)} />
                  <InfoRow label="Дата поступления" value={formatDate(vm.selectedJumbo.arrivalDate)} />
                  <InfoRow
                    label="Дата начала использования"
                    value={vm.selectedJumbo.usageStartDate ? formatDate(vm.selectedJumbo.usageStartDate) : "—"}
                    last
                  />
                </div>
                <SecondaryButton fullWidth onClick={vm.reset}>
                  {strings.production.changeJumbo}
                </SecondaryButton>
              </div>
            ) : (
              <JumboPicker
                jumbos={vm.availableJumbos}
                materialNameFor={materialNameFor}
                onPick={vm.selectJumbo}
              />
            )}
          </CardView>

          <CardView title={strings.production.params} icon={icons.cut} animate>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Ширина, мм</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    className="rounded-2xl"
                    value={vm.params.rollWidthMm || ""}
                    onChange={(e) => vm.updateParam("rollWidthMm", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Длина, м</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    className="rounded-2xl"
                    value={vm.params.rollLengthM || ""}
                    onChange={(e) => vm.updateParam("rollLengthM", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Заказ, шт</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    className="rounded-2xl"
                    value={vm.params.orderRolls || ""}
                    onChange={(e) => vm.updateParam("orderRolls", Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Фиксированный доп. размер (опц.), мм</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  className="rounded-2xl"
                  value={vm.params.additionalWidthMm ?? ""}
                  placeholder="Автоматически"
                  onChange={(e) =>
                    vm.updateParam(
                      "additionalWidthMm",
                      e.target.value === "" ? undefined : Number(e.target.value),
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Назначение доп. рулонов</Label>
                <SegmentedControl
                  options={destinationOptions}
                  value={vm.params.additionalDestination}
                  onChange={(value) => vm.updateParam("additionalDestination", value)}
                  aria-label="Назначение дополнительных рулонов"
                />
              </div>
            </div>
          </CardView>

          <CardView
            title={strings.production.results}
            icon={icons.dashboard}
            headerTone="accent"
            animate
            headerTrailing={
              vm.plan && vm.planStatus === "ok" ? (
                <StatusBadge
                  label={`Отход: ${vm.plan.waste_percent.toFixed(1)}%`}
                  tone={vm.plan.waste_percent > 7 ? "danger" : "neutral"}
                />
              ) : undefined
            }
          >
            {!vm.selectedJumbo ? (
              <div className="py-2 text-sm text-muted-foreground">
                Выберите Джамб, чтобы выполнить расчёт.
              </div>
            ) : vm.planStatus === "insufficient" ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-amber-300/40 bg-amber-50/60 p-3 dark:border-amber-800/30 dark:bg-amber-900/10">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden />
                    <div className="text-sm">
                      <div className="font-semibold text-amber-700 dark:text-amber-400">
                        Недостаточно материала на этом Джамбо
                      </div>
                      <div className="mt-1 text-muted-foreground">{vm.planError}</div>
                      {vm.plan && vm.plan.total_main_rolls > 0 ? (
                        <div className="mt-1 text-muted-foreground">
                          Этот Джамбо даёт {vm.plan.total_main_rolls} рул. из {vm.params.orderRolls}
                          {vm.plan.shortage_rolls > 0 ? ` · не хватает ${vm.plan.shortage_rolls} рул.` : ""}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                {!vm.orderValid ? (
                  <div className="text-xs text-muted-foreground">{strings.production.fillOrder}</div>
                ) : null}
                <ContinueOrderDialog
                  jumbos={vm.eligibleForContinue}
                  materialNameFor={materialNameFor}
                  onContinue={(jumbo) => void onContinue(jumbo)}
                  continuing={vm.continuing}
                  disabled={!vm.canContinue}
                  producedThisJumbo={vm.plan?.total_main_rolls ?? 0}
                  orderRolls={vm.params.orderRolls}
                />
              </div>
            ) : vm.planStatus === "error" ? (
              <div className="text-sm text-destructive">{vm.planError}</div>
            ) : vm.plan ? (
              <div className="space-y-4">
                <CuttingScheme plan={vm.plan} />
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="Всего рулонов" value={vm.plan.total_rolls} hint={`Осн.: ${vm.plan.total_main_rolls}`} />
                  <MetricCard label="Полезная площадь" value={formatArea(vm.plan.useful_area_m2)} />
                </div>
                <div className="space-y-2">
                  <InfoRow label="Ручьёв основных:" value={vm.plan.main_count} />
                  <InfoRow label="Циклов (прогонов):" value={vm.plan.cycles_used} />
                  <InfoRow label="Использовано материала:" value={formatMeters(vm.plan.used_length_m)} />
                  <InfoRow label="Остаток после расчёта:" value={formatMeters(vm.plan.remaining_jumbo_m)} />
                  {vm.plan.estimated_hours ? (
                    <InfoRow label="Примерное время:" value={formatHours(vm.plan.estimated_hours)} last />
                  ) : null}
                </div>

                <SecondaryButton
                  fullWidth
                  onClick={() => toast({ title: strings.production.wastePending })}
                >
                  {strings.production.addWaste}
                </SecondaryButton>

                {!vm.orderValid ? (
                  <div className="text-xs text-muted-foreground">{strings.production.fillOrder}</div>
                ) : null}

                <PrimaryButton
                  fullWidth
                  loading={vm.executing}
                  disabled={!vm.canExecute}
                  onClick={() => void onExecute()}
                >
                  {strings.production.execute}
                </PrimaryButton>
              </div>
            ) : (
              <div className="py-2 text-sm text-muted-foreground">Заполните параметры рулона.</div>
            )}
          </CardView>
        </div>
      )}
    </ScreenScaffold>
  );
}
