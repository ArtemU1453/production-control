import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  CheckCircle2,
  Maximize2,
  PackageSearch,
  Pause,
  Play,
  PlayCircle,
  Plus,
  Repeat2,
  ScrollText,
  ZoomIn,
  ZoomOut,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Button,
} from "@/components/ui/button";
import {
  CardView,
  EmptyState,
  IdentifierInput,
  LoadingView,
  PrimaryButton,
  ScreenScaffold,
  SecondaryButton,
  SegmentedControl,
  StatusBadge,
  type SegmentOption,
} from "@/components";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import { AppTypography } from "@/designsystem";
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
import { useProductionViewModel, type ProductionLogEntry } from "@/viewmodels";
import { CuttingScheme } from "./calculator/CuttingScheme";

type ProductionVM = ReturnType<typeof useProductionViewModel>;

const destinationOptions: ReadonlyArray<SegmentOption<RollDestination>> = [
  { value: RollDestination.order, label: "В заказ" },
  { value: RollDestination.warehouse, label: "На склад" },
];

const round1 = (v: number) => Math.round(v * 10) / 10;

function timeOf(iso: string): string {
  return new Date(iso).toTimeString().slice(0, 5);
}

const LOG_LABEL: Record<string, string> = {
  defect: "Брак",
  scrap: "Тех. отход",
  stop: "Остановка",
  comment: "Комментарий",
};

/** Order-status badge with the mockup's colour code (green/blue/orange/gray). */
function OrderStatusBadge({ vm }: { vm: ProductionVM }) {
  const tone =
    vm.phase === "running"
      ? "bg-primary/15 text-primary"
      : vm.phase === "paused"
        ? "bg-[hsl(38_92%_50%)]/15 text-[hsl(38_92%_38%)] dark:text-[hsl(38_92%_60%)]"
        : vm.phase === "completed"
          ? "bg-muted text-muted-foreground"
          : "bg-[hsl(142_71%_45%)]/15 text-[hsl(142_71%_35%)] dark:text-[hsl(142_71%_55%)]";
  return (
    <span className={cn(AppTypography.caption2, "inline-flex items-center rounded-full px-2 py-0.5", tone)}>
      {vm.orderStatusLabel}
    </span>
  );
}

/** A small KPI tile for the results grid. */
function Tile({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div className="rounded-lg border border-card-border bg-card/60 px-2.5 py-1.5">
      <div className={cn(AppTypography.caption, "truncate text-muted-foreground")}>{label}</div>
      <div className={cn(AppTypography.subheadline, "tabular-nums", tone === "danger" ? "text-destructive" : "")}>
        {value}
      </div>
    </div>
  );
}

/** Jumbo selection dialog (unchanged behaviour). */
function JumboPicker({
  jumbos,
  materialNameFor,
  onPick,
  label,
  icon = PackageSearch,
}: {
  jumbos: Jumbo[];
  materialNameFor: (jumbo: Jumbo) => string;
  onPick: (jumbo: Jumbo) => void;
  label: string;
  icon?: LucideIcon;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <PrimaryButton icon={icon}>{label}</PrimaryButton>
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
                className="w-full rounded-xl border bg-card/60 p-2.5 text-left transition-colors hover:border-primary"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={AppTypography.footnote}>
                    № {jumbo.stockNumber} · {jumbo.materialCode}
                  </span>
                  <StatusBadge label={jumboStatusTitle(jumbo.status)} tone={jumboStatusColorRole(jumbo.status)} />
                </div>
                <div className={cn(AppTypography.caption, "mt-1 text-muted-foreground")}>
                  {materialNameFor(jumbo)} · {jumbo.widthMm} мм · Остаток: {formatMeters(jumbo.currentRemainderM)}
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Compact overview cutting scheme with zoom controls and a fullscreen view. */
function SchemeBox({ plan }: { plan: NonNullable<ProductionVM["plan"]> }) {
  const [zoom, setZoom] = useState(1);
  const clamp = (z: number) => Math.max(0.6, Math.min(2, Math.round(z * 10) / 10));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={cn(AppTypography.caption2, "text-muted-foreground")}>Схема нарезки</span>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="secondary" className="h-7 w-7" aria-label="Уменьшить" onClick={() => setZoom((z) => clamp(z - 0.2))}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="secondary" className="h-7 px-2 text-xs" onClick={() => setZoom(1)}>
            100%
          </Button>
          <Button size="icon" variant="secondary" className="h-7 w-7" aria-label="Увеличить" onClick={() => setZoom((z) => clamp(z + 0.2))}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="icon" variant="secondary" className="h-7 w-7" aria-label="Развернуть">
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-auto">
              <DialogHeader>
                <DialogTitle>Схема нарезки</DialogTitle>
              </DialogHeader>
              <CuttingScheme plan={plan} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="max-h-[120px] overflow-auto rounded-xl border border-card-border bg-muted/20 p-1.5">
        <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", width: `${100 / zoom}%` }}>
          <CuttingScheme plan={plan} />
        </div>
      </div>
    </div>
  );
}

/** Full production journal dialog. */
function JournalDialog({ log }: { log: ProductionLogEntry[] }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="h-7 px-2 text-xs">
          <ScrollText className="mr-1 h-3.5 w-3.5" /> Все операции
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Журнал операций</DialogTitle>
        </DialogHeader>
        {log.length === 0 ? (
          <p className={cn(AppTypography.footnote, "text-muted-foreground")}>Записей пока нет.</p>
        ) : (
          <ul className="space-y-1">
            {log.map((entry) => (
              <li key={entry.id} className={cn(AppTypography.caption, "flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2 py-1")}>
                <span className="text-muted-foreground">
                  {timeOf(entry.at)} · {LOG_LABEL[entry.kind] ?? entry.kind}
                  {entry.count ? ` ×${entry.count}` : ""}
                </span>
                {entry.note ? <span className="truncate">{entry.note}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Final production summary shown once the order is completed. */
function CompletionSummaryCard({ vm }: { vm: ProductionVM }) {
  const s = vm.completionSummary;
  if (!s) {
    return null;
  }
  const durationMin = Math.round(s.durationMs / 60000);
  return (
    <CardView
      animate
      className="border-l-4 border-l-[hsl(142_71%_45%)]"
      title="Заказ выполнен"
      icon={icons.gauge}
      headerTrailing={<StatusBadge label={`Джамбо: ${s.jumbosUsed}`} tone="neutral" />}
    >
      <div className="space-y-3">
        <div className={cn(AppTypography.footnote, "text-muted-foreground")}>
          Заказ № {s.orderNumber || "—"}
          {s.customer ? ` · ${s.customer}` : ""}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Tile label="Изготовлено (годных)" value={`${s.goodRolls} шт.`} />
          <Tile label="Брак" value={`${s.defects} шт.`} tone={s.defects > 0 ? "danger" : undefined} />
          <Tile label="Использовано" value={formatMeters(s.usedMaterialM)} />
          <Tile label="Остаток" value={formatMeters(s.remainderM)} />
          <Tile label="Полезная площадь" value={formatArea(s.usefulAreaM2)} />
          <Tile label="Производительность" value={`${s.utilizationPercent}%`} />
          <Tile label="Время" value={`${durationMin} мин`} />
          <Tile label="Циклов" value={`${s.cycles}`} />
        </div>
        <div>
          <div className={cn(AppTypography.caption2, "mb-1 text-muted-foreground")}>Использованные Джамбо ({s.jumbosUsed})</div>
          <ol className="space-y-1">
            {s.steps.map((step, index) => (
              <li key={`${step.jumboStockNumber}-${index}`} className={cn(AppTypography.caption, "flex items-center gap-2 rounded-lg border bg-card/50 px-2 py-1")}>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[10px] font-semibold text-primary">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate">
                  № {step.jumboStockNumber} · изготовлено {step.producedMainRolls} · остаток {formatMeters(step.remainderAfterM)}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <SecondaryButton fullWidth onClick={vm.newOrder}>
          Новый заказ
        </SecondaryButton>
      </div>
    </CardView>
  );
}

export function ProductionView() {
  const vm = useProductionViewModel();
  const { toast } = useToast();
  const locked = vm.locked;

  const materialNameFor = (jumbo: Jumbo) => vm.materialsById.get(jumbo.materialId)?.name ?? "—";

  const plan = vm.plan;
  const scrapCount = useMemo(
    () => vm.productionLog.filter((e) => e.kind === "scrap").length,
    [vm.productionLog],
  );
  const rollAreaM2 = plan ? round1((plan.roll_width_mm / 1000) * plan.roll_length_m) : 0;
  const defectAreaM2 = round1(vm.defectCount * rollAreaM2);
  const recentLog = vm.productionLog.slice(0, 5);

  const target = vm.orderTotalRolls ?? vm.params.orderRolls;
  const projected = vm.producedMain + (vm.planStatus === "ok" && plan ? plan.total_main_rolls : 0);
  const progress = target > 0 ? Math.min(100, Math.round((projected / target) * 100)) : 0;
  const remainderM = vm.selectedJumbo?.currentRemainderM ?? 0;
  const remainderPct =
    vm.selectedJumbo && vm.selectedJumbo.initialWindingM > 0
      ? Math.round((vm.selectedJumbo.currentRemainderM / vm.selectedJumbo.initialWindingM) * 100)
      : 0;

  const onStart = () => {
    vm.startProduction();
    toast({ title: "Производство начато" });
  };
  const onFinish = async () => {
    const outcome = await vm.finishProduction();
    if (outcome) {
      toast({ title: strings.production.successNotice });
    }
  };
  const onContinue = async (jumbo: Jumbo) => {
    await vm.continueOnNewJumbo(jumbo);
    toast({ title: "Заказ продолжается на новом Джамбо" });
  };

  return (
    <ScreenScaffold title={strings.production.title} wide>
      {vm.loading ? (
        <LoadingView />
      ) : vm.phase === "completed" && vm.completionSummary ? (
        <CompletionSummaryCard vm={vm} />
      ) : (
        <div className="space-y-3 pb-2">
          {/* ── Top info bar ─────────────────────────────────────────── */}
          <CardView className="p-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
              <div className="space-y-1">
                <Label className="text-[11px]">Код заказа</Label>
                <IdentifierInput
                  id="order-number"
                  disabled={locked}
                  value={vm.order.orderNumber}
                  onChange={(next) => vm.updateOrder("orderNumber", next)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Заказчик</Label>
                <Input id="order-customer" disabled={locked} value={vm.order.customer} onChange={(e) => vm.updateOrder("customer", e.target.value)} className="rounded-2xl" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Дата</Label>
                <Input type="date" disabled value={vm.order.date} readOnly className="rounded-2xl" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Время</Label>
                <Input type="time" disabled value={vm.order.time} readOnly className="rounded-2xl" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Статус</Label>
                <div className="flex h-8 items-center">
                  <OrderStatusBadge vm={vm} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Станок</Label>
                <Select value={vm.order.machine} disabled={locked} onValueChange={(v) => vm.updateOrder("machine", v as Machine)}>
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {machineOrder.map((m) => (
                      <SelectItem key={m} value={m}>
                        {machineTitle(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Оператор</Label>
                <Input id="order-operator" disabled={locked} value={vm.order.operator} onChange={(e) => vm.updateOrder("operator", e.target.value)} className="rounded-2xl" />
              </div>
            </div>
            {locked ? (
              <div className={cn(AppTypography.caption, "mt-2 text-amber-600 dark:text-amber-400")}>{vm.busyMachineMessage}</div>
            ) : null}
          </CardView>

          {/* ── Jumbo bar (one line) ─────────────────────────────────── */}
          <CardView className="p-3">
            {vm.selectedJumbo ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className={cn(AppTypography.subheadline, "font-mono")}>№ {vm.selectedJumbo.stockNumber}</span>
                <span className={cn(AppTypography.caption, "text-muted-foreground")}>
                  {vm.selectedJumbo.materialCode} · {materialNameFor(vm.selectedJumbo)}
                </span>
                <span className={AppTypography.caption}>Ширина: {vm.selectedJumbo.widthMm} мм</span>
                <span className={AppTypography.caption}>Намотка: {formatMeters(vm.selectedJumbo.initialWindingM)}</span>
                <span className={AppTypography.caption}>
                  Остаток: <span className="font-semibold">{formatMeters(remainderM)}</span> · {remainderPct}%
                </span>
                {!locked ? (
                  <div className="ml-auto">
                    <SecondaryButton icon={PackageSearch} onClick={vm.reset}>
                      Сменить
                    </SecondaryButton>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={cn(AppTypography.footnote, "text-muted-foreground")}>Джамбо не выбран</span>
                <JumboPicker jumbos={vm.availableJumbos} materialNameFor={materialNameFor} onPick={vm.selectJumbo} label="Выбрать Джамбо" />
              </div>
            )}
          </CardView>

          {/* ── Middle: 60 / 40 ──────────────────────────────────────── */}
          <div className="grid gap-3 xl:grid-cols-5">
            {/* Left ~60% */}
            <div className="space-y-3 xl:col-span-3">
              <CardView title="Параметры рулона" icon={icons.cut} className="p-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Ширина, мм</Label>
                    <Input type="number" step="0.1" disabled={locked} value={vm.params.rollWidthMm || ""} onChange={(e) => vm.updateParam("rollWidthMm", Number(e.target.value))} className="rounded-2xl" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Длина, м</Label>
                    <Input type="number" disabled={locked} value={vm.params.rollLengthM || ""} onChange={(e) => vm.updateParam("rollLengthM", Number(e.target.value))} className="rounded-2xl" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Кол-во, шт</Label>
                    <Input type="number" disabled={locked} value={vm.params.orderRolls || ""} onChange={(e) => vm.updateParam("orderRolls", Number(e.target.value))} className="rounded-2xl" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Доп. размер</Label>
                    <Input type="number" step="0.1" disabled={locked} value={vm.params.additionalWidthMm ?? ""} placeholder="Авто" onChange={(e) => vm.updateParam("additionalWidthMm", e.target.value === "" ? undefined : Number(e.target.value))} className="rounded-2xl" />
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Label className="text-[11px] text-muted-foreground">Назначение доп.</Label>
                  <SegmentedControl options={destinationOptions} value={vm.params.additionalDestination} onChange={(v) => vm.updateParam("additionalDestination", v)} aria-label="Назначение дополнительных рулонов" />
                </div>
              </CardView>

              <CardView className="p-3">
                {plan && vm.planStatus === "ok" ? (
                  <SchemeBox plan={plan} />
                ) : vm.planStatus === "insufficient" ? (
                  <div className={cn(AppTypography.footnote, "flex items-start gap-2 text-amber-600 dark:text-amber-400")}>
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{vm.planError} {plan && plan.total_main_rolls > 0 ? `Даёт ${plan.total_main_rolls} из ${vm.params.orderRolls}.` : ""}</span>
                  </div>
                ) : (
                  <div className={cn(AppTypography.caption, "text-muted-foreground")}>
                    {vm.selectedJumbo ? vm.planError ?? "Заполните параметры рулона." : "Выберите Джамбо для расчёта."}
                  </div>
                )}
              </CardView>

              {/* Journal under the scheme */}
              <CardView className="p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className={cn(AppTypography.caption2, "text-muted-foreground")}>Журнал операций</span>
                  <JournalDialog log={vm.productionLog} />
                </div>
                {recentLog.length === 0 ? (
                  <div className={cn(AppTypography.caption, "text-muted-foreground")}>Событий пока нет.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className={cn(AppTypography.caption2, "text-muted-foreground")}>
                          <th className="py-1 pr-2 font-medium">Время</th>
                          <th className="py-1 pr-2 font-medium">Операция</th>
                          <th className="py-1 pr-2 font-medium">Кол-во</th>
                          <th className="py-1 font-medium">Описание</th>
                        </tr>
                      </thead>
                      <tbody className={cn(AppTypography.caption, "tabular-nums")}>
                        {recentLog.map((e) => (
                          <tr key={e.id} className="border-t border-card-border">
                            <td className="py-1 pr-2">{timeOf(e.at)}</td>
                            <td className="py-1 pr-2">{LOG_LABEL[e.kind] ?? e.kind}</td>
                            <td className="py-1 pr-2">{e.count ?? "—"}</td>
                            <td className="py-1 truncate text-muted-foreground">{e.note ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardView>
            </div>

            {/* Right ~40% */}
            <div className="space-y-3 xl:col-span-2">
              <CardView title="Результаты расчёта" icon={icons.dashboard} className="p-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
                  <Tile label="Выход" value={plan ? `${Math.round((plan.useful_area_m2 / Math.max(1, plan.total_area_m2)) * 100)}%` : "—"} />
                  <Tile label="Отход" value={plan ? `${plan.waste_percent.toFixed(1)}%` : "—"} tone={plan && plan.waste_percent > 7 ? "danger" : undefined} />
                  <Tile label="Рулонов" value={plan ? `${plan.total_rolls}` : "—"} />
                  <Tile label="Циклов" value={plan ? `${plan.cycles_used}` : "—"} />
                  <Tile label="Использовано" value={plan ? formatMeters(plan.used_length_m) : "—"} />
                  <Tile label="Остаток" value={plan ? formatMeters(plan.remaining_jumbo_m) : "—"} />
                  <Tile label="Полезная" value={plan ? formatArea(plan.useful_area_m2) : "—"} />
                  <Tile label="Потери" value={plan ? formatArea(plan.waste_area_m2) : "—"} />
                </div>
              </CardView>

              {/* Vertical operations buttons — equal height */}
              <CardView title="Операции" icon={icons.gauge} headerTone="accent" className="p-3">
                <div className="flex flex-col gap-2">
                  <SecondaryButton icon={Plus} className="h-9 justify-start" disabled={!locked} onClick={() => { vm.addDefect(1); toast({ title: "Брак зафиксирован" }); }}>
                    Добавить брак
                  </SecondaryButton>
                  <SecondaryButton icon={Plus} className="h-9 justify-start" disabled={!locked} onClick={() => { vm.addScrap(); toast({ title: "Тех. отход зафиксирован" }); }}>
                    Добавить тех. отход
                  </SecondaryButton>
                  {vm.canContinue ? (
                    <ReplaceJumboButton vm={vm} materialNameFor={materialNameFor} onContinue={onContinue} />
                  ) : (
                    <SecondaryButton icon={Repeat2} className="h-9 justify-start" disabled>
                      Заменить Джамбо
                    </SecondaryButton>
                  )}
                  {vm.phase === "running" ? (
                    <SecondaryButton icon={Pause} className="h-9 justify-start" onClick={vm.pauseProduction}>
                      Приостановить заказ
                    </SecondaryButton>
                  ) : vm.phase === "paused" ? (
                    <SecondaryButton icon={Play} className="h-9 justify-start" onClick={vm.resumeProduction}>
                      Продолжить заказ
                    </SecondaryButton>
                  ) : null}
                  {locked ? (
                    <PrimaryButton icon={CheckCircle2} className="h-9" fullWidth loading={vm.finishing} disabled={!vm.canExecute} onClick={() => void onFinish()}>
                      Завершить производство
                    </PrimaryButton>
                  ) : (
                    <PrimaryButton icon={PlayCircle} className="h-9" fullWidth disabled={!vm.canStart} onClick={onStart}>
                      Запустить производство
                    </PrimaryButton>
                  )}
                </div>
              </CardView>

              {/* Defect + tech-scrap */}
              <div className="grid grid-cols-2 gap-3">
                <CardView className="p-3">
                  <div className="flex items-center justify-between">
                    <span className={cn(AppTypography.caption2, "text-muted-foreground")}>Брак</span>
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  </div>
                  <div className={cn(AppTypography.title2, "mt-1 tabular-nums text-destructive")}>{vm.defectCount}</div>
                  <div className={cn(AppTypography.caption, "text-muted-foreground")}>рул. · {formatArea(defectAreaM2)}</div>
                  <SecondaryButton icon={Plus} fullWidth className="mt-2 h-8" disabled={!locked} onClick={() => vm.addDefect(1)}>
                    Добавить
                  </SecondaryButton>
                </CardView>
                <CardView className="p-3">
                  <span className={cn(AppTypography.caption2, "text-muted-foreground")}>Тех. отход</span>
                  <div className={cn(AppTypography.title2, "mt-1 tabular-nums")}>{scrapCount}</div>
                  <div className={cn(AppTypography.caption, "text-muted-foreground")}>записей · тек. Джамбо</div>
                  <SecondaryButton icon={Plus} fullWidth className="mt-2 h-8" disabled={!locked} onClick={() => vm.addScrap()}>
                    Добавить
                  </SecondaryButton>
                </CardView>
              </div>
            </div>
          </div>

          {/* ── Bottom status strip ──────────────────────────────────── */}
          <div className="z-10 rounded-xl border border-card-border bg-background/90 px-3 py-1.5 backdrop-blur lg:sticky lg:bottom-0">
            <div className={cn(AppTypography.caption, "flex flex-wrap items-center gap-x-4 gap-y-1")}>
              <span>Прогресс: <span className="font-semibold text-foreground">{progress}%</span></span>
              <span>Брак: <span className="font-semibold text-destructive">{vm.defectCount}</span> шт.</span>
              <span>Тех. отход: <span className="font-semibold text-foreground">{scrapCount}</span></span>
              <span>Полезная: <span className="font-semibold text-foreground">{plan ? formatArea(plan.useful_area_m2) : "—"}</span></span>
              <span className="ml-auto">Остаток Джамбо: <span className="font-semibold text-foreground">{vm.selectedJumbo ? formatMeters(remainderM) : "—"}</span></span>
            </div>
          </div>
        </div>
      )}
    </ScreenScaffold>
  );
}

/** "Заменить Джамбо" — reuses the continuation flow (books current, switches). */
function ReplaceJumboButton({
  vm,
  materialNameFor,
  onContinue,
}: {
  vm: ProductionVM;
  materialNameFor: (jumbo: Jumbo) => string;
  onContinue: (jumbo: Jumbo) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <SecondaryButton icon={Repeat2} className="h-9 justify-start" disabled={vm.continuing}>
          Заменить Джамбо
        </SecondaryButton>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Продолжение выполнения заказа</DialogTitle>
        </DialogHeader>
        <p className={cn(AppTypography.footnote, "text-muted-foreground")}>
          Текущего Джамбо недостаточно. Выберите следующий, чтобы продолжить заказ.
        </p>
        <div className="space-y-2">
          {vm.eligibleForContinue.map((jumbo) => (
            <button
              key={jumbo.id}
              type="button"
              disabled={vm.continuing}
              onClick={() => {
                onContinue(jumbo);
                setOpen(false);
              }}
              className="w-full rounded-xl border bg-card/60 p-2.5 text-left transition-colors hover:border-primary disabled:opacity-60"
            >
              <span className={AppTypography.footnote}>№ {jumbo.stockNumber} · {jumbo.materialCode}</span>
              <div className={cn(AppTypography.caption, "mt-1 text-muted-foreground")}>
                {materialNameFor(jumbo)} · {jumbo.widthMm} мм · Остаток: {formatMeters(jumbo.currentRemainderM)}
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
