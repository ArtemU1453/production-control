import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  PackageSearch,
  Pause,
  Play,
  PlayCircle,
  Plus,
  Repeat2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  ProgressBar,
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
import { formatArea, formatMeters } from "@/extensions/number";
import { formatDate } from "@/extensions/date";
import {
  useProductionViewModel,
  type ChainStep,
  type CompletionSummary,
} from "@/viewmodels";
import { CuttingScheme } from "./calculator/CuttingScheme";

type ProductionVM = ReturnType<typeof useProductionViewModel>;

const destinationOptions: ReadonlyArray<SegmentOption<RollDestination>> = [
  { value: RollDestination.order, label: "В заказ" },
  { value: RollDestination.warehouse, label: "На склад" },
];

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0 ? `${hours} ч ${minutes} мин` : `${minutes} мин ${seconds} с`;
}

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

/** Picker to continue / replace the Jumbo for the same order. */
function ContinueOrderDialog({
  jumbos,
  materialNameFor,
  onContinue,
  continuing,
  disabled,
  producedThisJumbo,
  orderRolls,
  triggerLabel = "Продолжить на новом Джамбо",
  triggerIcon = Plus,
}: {
  jumbos: Jumbo[];
  materialNameFor: (jumbo: Jumbo) => string;
  onContinue: (jumbo: Jumbo) => void;
  continuing: boolean;
  disabled: boolean;
  producedThisJumbo: number;
  orderRolls: number;
  triggerLabel?: string;
  triggerIcon?: LucideIcon;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <PrimaryButton icon={triggerIcon} fullWidth loading={continuing} disabled={disabled}>
          {triggerLabel}
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
      </ol>
    </CardView>
  );
}

/** "Выполняется заказ" — the live active-order card shown while in work. */
function ActiveOrderCard({
  vm,
  materialNameFor,
}: {
  vm: ProductionVM;
  materialNameFor: (jumbo: Jumbo) => string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const target = vm.orderTotalRolls ?? vm.params.orderRolls;
  const projected =
    vm.producedMain + (vm.planStatus === "ok" && vm.plan ? vm.plan.total_main_rolls : 0);
  const progress = target > 0 ? Math.min(100, Math.round((projected / target) * 100)) : 0;
  const remaining = Math.max(0, target - vm.producedMain);
  const elapsed = vm.startedAt ? now - new Date(vm.startedAt).getTime() : 0;

  return (
    <CardView
      animate
      className="border-l-4 border-l-primary"
      headerTone="accent"
      title="● Выполняется заказ"
      icon={icons.gauge}
      headerTrailing={
        <StatusBadge label={vm.orderStatusLabel} tone={vm.phase === "paused" ? "warning" : "neutral"} />
      }
    >
      <div className="space-y-3">
        <div className="space-y-2">
          <InfoRow label="Начало" value={vm.startedAt ? formatDate(vm.startedAt) + " · " + new Date(vm.startedAt).toTimeString().slice(0, 5) : "—"} />
          <InfoRow label="Оператор" value={vm.order.operator || "—"} />
          <InfoRow label="Станок" value={machineTitle(vm.order.machine)} />
          <InfoRow
            label="Материал"
            value={vm.selectedJumbo ? `${vm.selectedJumbo.materialCode} · ${materialNameFor(vm.selectedJumbo)}` : "—"}
          />
          <InfoRow label="Джамбо" value={vm.selectedJumbo ? `№ ${vm.selectedJumbo.stockNumber}` : "—"} />
          <InfoRow label="Осталось выполнить" value={`${remaining} рул.`} />
          <InfoRow label="Время работы" value={formatDuration(elapsed)} last />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Прогресс выполнения</span>
            <span className="font-semibold text-foreground">{progress}%</span>
          </div>
          <ProgressBar value={progress} tone="neutral" aria-label={`Прогресс ${progress}%`} />
        </div>
      </div>
    </CardView>
  );
}

/** Controls available only while an order is in work. */
function ProductionControls({
  vm,
  materialNameFor,
  onDefect,
  onScrap,
  onContinue,
  onFinish,
}: {
  vm: ProductionVM;
  materialNameFor: (jumbo: Jumbo) => string;
  onDefect: () => void;
  onScrap: () => void;
  onContinue: (jumbo: Jumbo) => void;
  onFinish: () => void;
}) {
  const kindLabel: Record<string, string> = {
    defect: "Брак",
    scrap: "Тех. отход",
    stop: "Остановка",
    comment: "Комментарий",
  };
  return (
    <CardView title="Производство" icon={icons.cut} headerTone="accent" animate>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <SecondaryButton icon={Plus} onClick={onDefect}>
            Добавить брак
          </SecondaryButton>
          <SecondaryButton icon={Plus} onClick={onScrap}>
            Тех. отход
          </SecondaryButton>
          {vm.phase === "running" ? (
            <SecondaryButton icon={Pause} onClick={vm.pauseProduction}>
              Приостановить
            </SecondaryButton>
          ) : (
            <SecondaryButton icon={Play} onClick={vm.resumeProduction}>
              Продолжить
            </SecondaryButton>
          )}
          <ContinueOrderDialog
            jumbos={vm.eligibleForContinue}
            materialNameFor={materialNameFor}
            onContinue={onContinue}
            continuing={vm.continuing}
            disabled={!vm.canContinue}
            producedThisJumbo={vm.plan?.total_main_rolls ?? 0}
            orderRolls={vm.params.orderRolls}
            triggerLabel="Заменить Джамбо"
            triggerIcon={Repeat2}
          />
        </div>

        {vm.defectCount > 0 ? (
          <div className="text-xs text-muted-foreground">
            Зафиксировано брака: <span className="font-semibold text-destructive">{vm.defectCount}</span> · записей в
            журнале: {vm.productionLog.length}
          </div>
        ) : null}

        {vm.productionLog.length > 0 ? (
          <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
            {vm.productionLog.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2 py-1">
                <span className="text-muted-foreground">
                  {new Date(entry.at).toTimeString().slice(0, 5)} · {kindLabel[entry.kind] ?? entry.kind}
                  {entry.count ? ` ×${entry.count}` : ""}
                </span>
                {entry.note ? <span className="truncate">{entry.note}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}

        {vm.planStatus === "insufficient" ? (
          <div className="text-xs text-amber-600 dark:text-amber-400">
            Текущего Джамбо не хватает — замените Джамбо, чтобы завершить заказ.
          </div>
        ) : null}

        <PrimaryButton
          fullWidth
          icon={CheckCircle2}
          loading={vm.finishing}
          disabled={!vm.canExecute}
          onClick={onFinish}
        >
          Завершить производство
        </PrimaryButton>
      </div>
    </CardView>
  );
}

/** Final production summary shown once the order is completed. */
function CompletionSummaryCard({
  summary,
  onNewOrder,
}: {
  summary: CompletionSummary;
  onNewOrder: () => void;
}) {
  return (
    <CardView
      animate
      className="border-l-4 border-l-[hsl(142_71%_45%)]"
      title="Заказ выполнен"
      icon={icons.gauge}
      headerTrailing={<StatusBadge label="Выполнен" tone="neutral" />}
    >
      <div className="space-y-3">
        <div className="text-sm text-muted-foreground">
          Заказ № {summary.orderNumber || "—"}
          {summary.customer ? ` · ${summary.customer}` : ""}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Изготовлено (годных)" value={`${summary.goodRolls} шт.`} hint={`Всего: ${summary.producedMainRolls} · цель: ${summary.targetRolls}`} />
          <MetricCard label="Брак" value={`${summary.defects} шт.`} />
          <MetricCard label="Использовано материала" value={formatMeters(summary.usedMaterialM)} />
          <MetricCard label="Остаток" value={formatMeters(summary.remainderM)} />
          <MetricCard label="Полезная площадь" value={formatArea(summary.usefulAreaM2)} />
          <MetricCard label="Производительность" value={`${summary.utilizationPercent}%`} hint={`Отход: ${formatArea(summary.totalWasteAreaM2)}`} />
          <MetricCard label="Время выполнения" value={formatDuration(summary.durationMs)} />
          <MetricCard label="Циклов" value={summary.cycles} />
        </div>

        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Использованные Джамбо ({summary.jumbosUsed})
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

  const materialNameFor = (jumbo: Jumbo) => vm.materialsById.get(jumbo.materialId)?.name ?? "—";
  const locked = vm.locked;

  const onContinue = async (jumbo: Jumbo) => {
    await vm.continueOnNewJumbo(jumbo);
    toast({ title: "Заказ продолжается на новом Джамбо" });
  };

  const onStart = () => {
    vm.startProduction();
    toast({ title: "Производство начато", description: "Заказ переведён в статус «В работе»." });
  };

  const onFinish = async () => {
    const outcome = await vm.finishProduction();
    if (outcome) {
      toast({
        title: strings.production.successNotice,
        description: outcome.becameWriteOff ? strings.production.writeOffNotice : undefined,
      });
    }
  };

  return (
    <ScreenScaffold title={strings.production.title} subtitle={`Статус заказа: ${vm.orderStatusLabel}`}>
      {vm.loading ? (
        <LoadingView />
      ) : vm.phase === "completed" && vm.completionSummary ? (
        <CompletionSummaryCard summary={vm.completionSummary} onNewOrder={vm.newOrder} />
      ) : (
        <div className="space-y-4">
          {locked ? <ActiveOrderCard vm={vm} materialNameFor={materialNameFor} /> : null}

          {vm.chainSteps.length > 0 ? (
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
                  <Input id="order-date" type="date" className="rounded-2xl" disabled={locked} value={vm.order.date} onChange={(e) => vm.updateOrder("date", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="order-time">Время</Label>
                  <Input id="order-time" type="time" className="rounded-2xl" disabled={locked} value={vm.order.time} onChange={(e) => vm.updateOrder("time", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="order-customer">Заказчик</Label>
                  <Input id="order-customer" className="rounded-2xl" disabled={locked} value={vm.order.customer} onChange={(e) => vm.updateOrder("customer", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="order-number">Номер заказа</Label>
                  <Input id="order-number" className="rounded-2xl" disabled={locked} value={vm.order.orderNumber} onChange={(e) => vm.updateOrder("orderNumber", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="order-operator">Оператор</Label>
                  <Input id="order-operator" className="rounded-2xl" disabled={locked} value={vm.order.operator} onChange={(e) => vm.updateOrder("operator", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Станок</Label>
                  <Select value={vm.order.machine} disabled={locked} onValueChange={(value) => vm.updateOrder("machine", value as Machine)}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {machineOrder.map((machine) => (
                        <SelectItem key={machine} value={machine}>
                          {machineTitle(machine)} · {vm.machineStatusLabel(machine)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {locked ? (
                <div className="rounded-xl border border-amber-300/40 bg-amber-50/60 p-2.5 text-xs text-amber-700 dark:border-amber-800/30 dark:bg-amber-900/10 dark:text-amber-400">
                  {vm.busyMachineMessage}
                </div>
              ) : null}
              <div className="space-y-1">
                <Label htmlFor="order-comment">Комментарий</Label>
                <Textarea id="order-comment" className="rounded-2xl" disabled={locked} value={vm.order.comment ?? ""} onChange={(e) => vm.updateOrder("comment", e.target.value)} placeholder="Необязательно" />
              </div>
            </div>
          </CardView>

          <CardView title={strings.production.jumbo} icon={icons.jumbo} animate>
            {vm.selectedJumbo ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{strings.production.usedJumbo}</span>
                  <StatusBadge label={jumboStatusTitle(vm.selectedJumbo.status)} tone={jumboStatusColorRole(vm.selectedJumbo.status)} />
                </div>
                <div className="space-y-2">
                  <InfoRow label="Номер складского учёта" value={vm.selectedJumbo.stockNumber} />
                  <InfoRow label="Материал" value={`${vm.selectedJumbo.materialCode} · ${materialNameFor(vm.selectedJumbo)}`} />
                  <InfoRow label="Ширина" value={`${vm.selectedJumbo.widthMm} мм`} />
                  <InfoRow label="Начальная намотка" value={formatMeters(vm.selectedJumbo.initialWindingM)} />
                  <InfoRow label="Текущий остаток" value={formatMeters(vm.selectedJumbo.currentRemainderM)} last />
                </div>
                {!locked ? (
                  <SecondaryButton fullWidth onClick={vm.reset}>
                    {strings.production.changeJumbo}
                  </SecondaryButton>
                ) : null}
              </div>
            ) : (
              <JumboPicker jumbos={vm.availableJumbos} materialNameFor={materialNameFor} onPick={vm.selectJumbo} />
            )}
          </CardView>

          <CardView title={strings.production.params} icon={icons.cut} animate>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Ширина, мм</Label>
                  <Input type="number" inputMode="decimal" step="0.1" className="rounded-2xl" disabled={locked} value={vm.params.rollWidthMm || ""} onChange={(e) => vm.updateParam("rollWidthMm", Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Длина, м</Label>
                  <Input type="number" inputMode="numeric" className="rounded-2xl" disabled={locked} value={vm.params.rollLengthM || ""} onChange={(e) => vm.updateParam("rollLengthM", Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Заказ, шт</Label>
                  <Input type="number" inputMode="numeric" className="rounded-2xl" disabled={locked} value={vm.params.orderRolls || ""} onChange={(e) => vm.updateParam("orderRolls", Number(e.target.value))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Фиксированный доп. размер (опц.), мм</Label>
                <Input type="number" inputMode="decimal" step="0.1" className="rounded-2xl" disabled={locked} value={vm.params.additionalWidthMm ?? ""} placeholder="Автоматически" onChange={(e) => vm.updateParam("additionalWidthMm", e.target.value === "" ? undefined : Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Назначение доп. рулонов</Label>
                <SegmentedControl options={destinationOptions} value={vm.params.additionalDestination} onChange={(value) => vm.updateParam("additionalDestination", value)} aria-label="Назначение дополнительных рулонов" />
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
                <StatusBadge label={`Отход: ${vm.plan.waste_percent.toFixed(1)}%`} tone={vm.plan.waste_percent > 7 ? "danger" : "neutral"} />
              ) : undefined
            }
          >
            {!vm.selectedJumbo ? (
              <div className="py-2 text-sm text-muted-foreground">Выберите Джамб, чтобы выполнить расчёт.</div>
            ) : vm.planStatus === "insufficient" ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-amber-300/40 bg-amber-50/60 p-3 dark:border-amber-800/30 dark:bg-amber-900/10">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden />
                    <div className="text-sm">
                      <div className="font-semibold text-amber-700 dark:text-amber-400">Недостаточно материала на этом Джамбо</div>
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
                {vm.phase === "setup" ? (
                  <ContinueOrderDialog
                    jumbos={vm.eligibleForContinue}
                    materialNameFor={materialNameFor}
                    onContinue={(jumbo) => void onContinue(jumbo)}
                    continuing={vm.continuing}
                    disabled={!vm.canContinue}
                    producedThisJumbo={vm.plan?.total_main_rolls ?? 0}
                    orderRolls={vm.params.orderRolls}
                  />
                ) : null}
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
                  <InfoRow label="Остаток после расчёта:" value={formatMeters(vm.plan.remaining_jumbo_m)} last />
                </div>

                {vm.phase === "setup" ? (
                  <>
                    {!vm.orderValid ? (
                      <div className="text-xs text-muted-foreground">{strings.production.fillOrder}</div>
                    ) : null}
                    <PrimaryButton fullWidth icon={PlayCircle} disabled={!vm.canStart} onClick={onStart}>
                      Приступить к выполнению
                    </PrimaryButton>
                  </>
                ) : null}
              </div>
            ) : (
              <div className="py-2 text-sm text-muted-foreground">Заполните параметры рулона.</div>
            )}
          </CardView>

          {locked ? (
            <ProductionControls
              vm={vm}
              materialNameFor={materialNameFor}
              onDefect={() => {
                vm.addDefect(1);
                toast({ title: "Брак зафиксирован" });
              }}
              onScrap={() => {
                vm.addScrap();
                toast({ title: "Тех. отход зафиксирован" });
              }}
              onContinue={(jumbo) => void onContinue(jumbo)}
              onFinish={() => void onFinish()}
            />
          ) : null}
        </div>
      )}
    </ScreenScaffold>
  );
}
