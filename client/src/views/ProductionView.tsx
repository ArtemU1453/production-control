import { forwardRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  Info,
  PackageSearch,
  Pause,
  Play,
  PlayCircle,
  Repeat2,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  CardView,
  EmptyState,
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
  Coating,
  Machine,
  RollDestination,
  coatingOrder,
  coatingTitle,
  jumboStatusColorRole,
  jumboStatusTitle,
  machineTitle,
  type Jumbo,
} from "@/models";
import { formatArea, formatMeters } from "@/extensions/number";
import { formatLocalDate, formatLocalTime } from "@/extensions/date";
import { useClock } from "@/hooks/useClock";
import { useProductionViewModel, type ProductionLogEntry } from "@/viewmodels";
import { CuttingVisualizer, buildCuttingModel, type StripeKind } from "./calculator";

type ProductionVM = ReturnType<typeof useProductionViewModel>;

const additionalModeOptions: ReadonlyArray<SegmentOption<"auto" | "manual">> = [
  { value: "auto", label: "Авто" },
  { value: "manual", label: "Вручную" },
];

const destinationOptions: ReadonlyArray<SegmentOption<RollDestination>> = [
  { value: RollDestination.order, label: "В заказ" },
  { value: RollDestination.warehouse, label: "На склад" },
];

/** Shown when the current Jumbo covers only part of the order — the order is not
 *  replaced but continued on the next Jumbo after this one is fully used. */
const PARTIAL_JUMBO_MESSAGE =
  "Текущего Джамбо хватит только на часть заказа. Будет автоматически создан следующий этап производства после полного использования текущего Джамбо. Продолжайте производство.";

export function timeOf(iso: string): string {
  return new Date(iso).toTimeString().slice(0, 5);
}

export const LOG_LABEL: Record<ProductionLogEntry["kind"], string> = {
  defect: "Брак",
  tech: "Технический цикл",
  stop: "Остановка",
  comment: "Комментарий",
  start: "Начато производство",
  exhausted: "Джамбо полностью использован",
  connect: "Подключён Джамбо",
  continue: "Продолжено производство",
  pause: "Пауза",
  resume: "Возобновление",
  finish: "Завершение",
};

export function journalCount(entry: ProductionLogEntry): string {
  if (entry.kind === "defect") {
    return `${entry.count ?? 1} рул.${entry.widthMm ? ` (${entry.widthMm} мм)` : ""}`;
  }
  if (entry.kind === "tech") {
    return entry.meters ? `${entry.meters} м` : "—";
  }
  return "—";
}

export function journalDescription(entry: ProductionLogEntry): string {
  const parts = [entry.reason, entry.note].filter((p): p is string => Boolean(p && p.length));
  return parts.length ? parts.join(" · ") : "—";
}

/**
 * Live production KPIs derived from a machine's ViewModel. Both the machine
 * detail screen and the two-machine overview compute the same numbers from the
 * same VM, so this keeps them in exact agreement (no divergence between views).
 */
export function deriveMachineStats(vm: ProductionVM) {
  const plan = vm.plan;
  // «Заказ» — целевое количество ГОДНЫХ рулонов.
  const target = vm.orderTotalRolls ?? vm.params.orderRolls;
  // Изготовлено = завершённые Джамбо цепочки + текущий расчёт.
  const producedRolls = vm.producedMain + (plan && vm.planStatus !== "error" ? plan.total_main_rolls : 0);
  // «Выполнено» / «Осталось» по заказу считаются по ГОДНОЙ продукции
  // (изготовлено − брак): заказ закрывается только когда годных ≥ заказа.
  const doneRolls = Math.max(0, producedRolls - vm.defectCount);
  const remainingRolls = Math.max(0, target - doneRolls);
  const remainderPct =
    vm.selectedJumbo && vm.selectedJumbo.initialWindingM > 0
      ? Math.round((vm.liveRemainderM / vm.selectedJumbo.initialWindingM) * 100)
      : 0;
  const yieldPercent =
    plan && plan.total_area_m2 > 0 ? Math.round((plan.useful_area_m2 / plan.total_area_m2) * 100) : null;
  const additionalToWarehouse =
    plan && vm.params.additionalDestination === RollDestination.warehouse ? plan.total_additional_rolls : 0;
  // Следующий Джамбо, зарезервированный для продолжения заказа (первый доступный).
  const reservedNext = vm.eligibleForContinue[0] ?? null;
  return {
    plan,
    target,
    producedRolls,
    doneRolls,
    remainingRolls,
    remainderPct,
    yieldPercent,
    additionalToWarehouse,
    reservedNext,
  };
}

/** Order-status badge with the mockup's colour code (green/yellow/red). */
export function OrderStatusBadge({ vm }: { vm: ProductionVM }) {
  const dot =
    vm.phase === "running"
      ? "bg-[hsl(142_71%_45%)]"
      : vm.phase === "paused"
        ? "bg-[hsl(38_92%_50%)]"
        : vm.phase === "completed"
          ? "bg-destructive"
          : "bg-muted-foreground";
  const tone =
    vm.phase === "running"
      ? "text-[hsl(142_71%_38%)] dark:text-[hsl(142_71%_60%)]"
      : vm.phase === "paused"
        ? "text-[hsl(38_92%_40%)] dark:text-[hsl(38_92%_62%)]"
        : vm.phase === "completed"
          ? "text-destructive"
          : "text-muted-foreground";
  return (
    <span className={cn(AppTypography.footnote, "inline-flex items-center gap-1.5 font-semibold", tone)}>
      <span className={cn("h-2 w-2 rounded-full", dot)} />
      {vm.orderStatusLabel}
    </span>
  );
}

/** A small KPI tile for the results grid — all tiles share the same size. */
export function Tile({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div className="rounded-lg border border-card-border bg-card/60 px-2.5 py-1.5">
      <div className={cn(AppTypography.caption, "truncate text-muted-foreground")}>{label}</div>
      <div className={cn(AppTypography.subheadline, "tabular-nums", tone === "danger" ? "text-destructive" : "")}>
        {value}
      </div>
    </div>
  );
}

/**
 * OpButton — a compact, semantically-coloured operation button for the machine
 * «Операции» panel (colour encodes the action's meaning per the spec). Forwards
 * its ref and props so it can be used as a Radix `DialogTrigger asChild` child.
 */
interface OpButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  /** Tailwind bg + hover classes, e.g. "bg-[#22C55E] hover:bg-[#16A34A]". */
  color: string;
  loading?: boolean;
}
const OpButton = forwardRef<HTMLButtonElement, OpButtonProps>(function OpButton(
  { icon: Icon, color, loading, children, className, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      {...props}
      className={cn(
        "flex h-11 w-full items-center justify-center gap-2 rounded-[10px] px-3.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        color,
        className,
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
      {children}
    </button>
  );
});

/** A compact result tile for the roll counts, with a size chip (main = grey,
 *  additional = blue) below the count. */
function RollResultTile({
  label,
  count,
  widthMm,
  tone,
}: {
  label: string;
  count: number;
  widthMm: number | null;
  tone: "main" | "additional";
}) {
  return (
    <div className="rounded-lg border border-card-border bg-card/60 px-2.5 py-1.5">
      <div className={cn(AppTypography.caption, "truncate text-muted-foreground")}>{label}</div>
      <div className={cn(AppTypography.subheadline, "tabular-nums")}>{count} шт.</div>
      {widthMm ? (
        <span
          className={cn(
            "mt-1 inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold",
            tone === "additional" ? "bg-primary text-primary-foreground" : "bg-slate-300 text-slate-900",
          )}
        >
          {widthMm} мм
        </span>
      ) : null}
    </div>
  );
}

/** A compact labelled field cell — value shown read-only or as an input. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <div className={cn(AppTypography.caption2, "text-muted-foreground")}>{label}</div>
      {children}
    </div>
  );
}

function StaticValue({ children }: { children: ReactNode }) {
  return <div className={cn(AppTypography.footnote, "truncate font-medium")}>{children ?? "—"}</div>;
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px]">{label}</Label>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-2xl"
      />
    </div>
  );
}

/** Compact chain of Jumbos used by the order: ✓ done · ▶ active. */
function ChainStrip({ vm }: { vm: ProductionVM }) {
  const items: Array<{ stock: string; state: "done" | "active" }> = [
    ...vm.chainSteps.map((s) => ({ stock: s.jumboStockNumber, state: "done" as const })),
    ...(vm.selectedJumbo ? [{ stock: vm.selectedJumbo.stockNumber, state: "active" as const }] : []),
  ];
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-card-border pt-2.5">
      <span className={cn(AppTypography.caption2, "text-muted-foreground")}>Используемые Джамбо:</span>
      {items.map((it) => (
        <span
          key={it.stock}
          className={cn(
            AppTypography.caption,
            "inline-flex items-center gap-1 font-medium",
            it.state === "done" ? "text-[hsl(142_71%_40%)] dark:text-[hsl(142_71%_58%)]" : "text-primary",
          )}
        >
          {it.state === "done" ? <Check className="h-3.5 w-3.5" /> : <Play className="h-3 w-3 fill-current" />}
          {it.stock}
        </span>
      ))}
    </div>
  );
}

/** Jumbo selection dialog (unchanged selection behaviour). */
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

/** «Добавить брак» — opens a form and only records on confirm. */
/** Cancel confirmation — discards the active production session (no history). */
export function CancelDialog({ vm, trigger }: { vm: ProductionVM; trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <SecondaryButton icon={XCircle} className="h-9 justify-start text-destructive hover:text-destructive">
            Отменить производство
          </SecondaryButton>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Отменить производство?</DialogTitle>
        </DialogHeader>
        <p className={cn(AppTypography.footnote, "text-muted-foreground")}>
          Текущая незавершённая сессия будет удалена: форма, выбранный Джамбо, журнал и расчёты
          очистятся, станок освободится. Действие необратимо.
        </p>
        <DialogFooter>
          <SecondaryButton onClick={() => setOpen(false)}>Продолжить производство</SecondaryButton>
          <Button variant="destructive" className="rounded-2xl" onClick={() => { vm.cancelProduction(); setOpen(false); }}>
            Отменить производство
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DefectDialog({ vm, disabled, trigger }: { vm: ProductionVM; disabled: boolean; trigger?: ReactNode }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [count, setCount] = useState("1");
  const [widthMm, setWidthMm] = useState("");
  const [windingM, setWindingM] = useState("");
  const [comment, setComment] = useState("");

  const onOpenChange = (next: boolean) => {
    if (next) {
      setReason("");
      setCount("1");
      setWidthMm(vm.params.rollWidthMm ? String(vm.params.rollWidthMm) : "");
      setWindingM(vm.params.rollLengthM ? String(vm.params.rollLengthM) : "");
      setComment("");
    }
    setOpen(next);
  };

  const submit = () => {
    vm.addDefect({
      count: Number(count) || 1,
      reason: reason.trim() || undefined,
      widthMm: widthMm ? Number(widthMm) : undefined,
      windingM: windingM ? Number(windingM) : undefined,
      comment: comment.trim() || undefined,
    });
    toast({ title: "Брак зафиксирован" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <SecondaryButton icon={AlertTriangle} className="h-9 justify-start" disabled={disabled}>
            Добавить брак
          </SecondaryButton>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Регистрация брака</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <LabeledInput label="Причина брака" value={reason} onChange={setReason} placeholder="Напр. разрыв материала" />
          <div className="grid grid-cols-3 gap-2">
            <LabeledInput label="Кол-во рул." type="number" value={count} onChange={setCount} />
            <LabeledInput label="Ширина, мм" type="number" value={widthMm} onChange={setWidthMm} />
            <LabeledInput label="Намотка, м" type="number" value={windingM} onChange={setWindingM} />
          </div>
          <LabeledInput label="Комментарий" value={comment} onChange={setComment} />
          <p className={cn(AppTypography.caption, "text-muted-foreground")}>
            Запись привязывается к текущему Джамбо № {vm.selectedJumbo?.stockNumber ?? "—"}: обновит его статистику брака
            и уменьшит его остаток.
          </p>
          <PrimaryButton fullWidth icon={CheckCircle2} onClick={submit}>
            Подтвердить
          </PrimaryButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** «Подключить следующий Джамбо» — books the current Jumbo and continues the
 *  same order on the next one (no order is created, no defects carry over). */
export function NextJumboDialog({ vm, materialNameFor, trigger }: { vm: ProductionVM; materialNameFor: (jumbo: Jumbo) => string; trigger?: ReactNode }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const none = vm.eligibleForContinue.length === 0;
  const pick = async (jumbo: Jumbo) => {
    await vm.continueOnNewJumbo(jumbo);
    toast({ title: "Джамбо сменён, заказ продолжается" });
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <SecondaryButton icon={Repeat2} className="h-9 justify-start" disabled={none || vm.continuing}>
            Сменить Джамбо
          </SecondaryButton>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Выберите следующий Джамбо</DialogTitle>
        </DialogHeader>
        <p className={cn(AppTypography.footnote, "text-muted-foreground")}>
          Текущий Джамбо полностью использован. Выберите следующий Джамбо для продолжения выполнения заказа — заказ
          остаётся тем же.
        </p>
        {none ? (
          <EmptyState
            icon={icons.warehouse}
            title="Нет доступных Джамбо"
            message="Все подходящие Джамбо уже задействованы. Оформите поступление сырья."
            action={
              <Link href="/warehouse/receipt">
                <PrimaryButton icon={icons.boxes}>Поступление сырья</PrimaryButton>
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {vm.eligibleForContinue.map((jumbo) => (
              <button
                key={jumbo.id}
                type="button"
                disabled={vm.continuing}
                onClick={() => void pick(jumbo)}
                className="w-full rounded-xl border bg-card/60 p-2.5 text-left transition-colors hover:border-primary disabled:opacity-60"
              >
                <span className={AppTypography.footnote}>
                  № {jumbo.stockNumber} · {jumbo.materialCode}
                </span>
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
        <div className={cn(AppTypography.footnote, "font-medium")}>
          {s.customer.trim() ? s.customer : "Не указан"}
          {s.orderNumber ? (
            <span className="ml-1.5 font-normal text-muted-foreground">· Заказ № {s.orderNumber}</span>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Tile label="Заказ" value={`${s.targetRolls} шт.`} />
          <Tile label="Годной продукции изготовлено" value={`${s.goodRolls} шт.`} />
          <Tile label="Передано по заказу" value={`${s.orderDeliveredRolls} шт.`} />
          {s.warehouseSurplusRolls > 0 ? (
            <Tile label="Передано на склад" value={`${s.warehouseSurplusRolls} шт.`} />
          ) : null}
          <Tile label="Брак" value={`${s.defects} шт.`} tone={s.defects > 0 ? "danger" : undefined} />
          <Tile label="Использовано" value={formatMeters(s.usedMaterialM)} />
          <Tile label="Остаток" value={formatMeters(s.remainderM)} />
          <Tile label="Производительность" value={`${s.utilizationPercent}%`} />
          <Tile label="Время" value={`${durationMin} мин`} />
          <Tile label="Циклов" value={`${s.cycles}`} />
        </div>
        <div>
          <div className={cn(AppTypography.caption2, "mb-1 text-muted-foreground")}>Использованные Джамбо ({s.jumbosUsed}) — каждый списывается отдельно</div>
          <ol className="space-y-1">
            {s.steps.map((step, index) => (
              <li key={`${step.jumboStockNumber}-${index}`} className={cn(AppTypography.caption, "flex items-center gap-2 rounded-lg border bg-card/50 px-2 py-1")}>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[10px] font-semibold text-primary">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate">
                  № {step.jumboStockNumber} · использовано {formatMeters(step.consumedM)} · изготовлено {step.producedMainRolls} · остаток {formatMeters(step.remainderAfterM)}
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

/**
 * Machine detail screen — the full setup + run management surface for a single
 * machine. Reached from the two-machine overview via «Детали ↗». Every piece of
 * state is bound to the machine passed in, so Станок №1 and Станок №2 run as two
 * completely independent processes.
 */
export function ProductionMachineView({ machine }: { machine: Machine }) {
  const vm = useProductionViewModel(machine);
  const { toast } = useToast();
  // Live current date/time for the header — synced to the operator's local
  // computer clock, refreshed every second (see useClock). This is the current
  // interface time, independent of the order's own timestamps and of every
  // historical production-event timestamp, which never change.
  const now = useClock();
  // Hover-highlight state for the cutting scheme (kind ↔ chips/legend).
  const [schemeKind, setSchemeKind] = useState<StripeKind | null>(null);
  const locked = vm.locked;
  const plan = vm.plan;
  const insufficient = vm.planStatus === "insufficient";

  const materialNameFor = (jumbo: Jumbo) => vm.materialsById.get(jumbo.materialId)?.name ?? "—";

  const {
    remainderPct,
    yieldPercent,
    additionalToWarehouse,
    reservedNext,
  } = deriveMachineStats(vm);

  // Single source of truth for the start button (vm.canStart) — this only
  // surfaces which required field is still missing.
  const startRequirements = [
    { ok: Boolean(vm.materialId), label: "Материал" },
    { ok: Boolean(vm.selectedJumbo), label: "Джамбо" },
    { ok: vm.order.customer.trim().length > 0, label: "Заказчик" },
    { ok: vm.order.operator.trim().length > 0, label: "Оператор" },
    { ok: Boolean(vm.order.machine), label: "Станок" },
    { ok: Boolean(plan && plan.total_main_rolls > 0), label: "Расчёт схемы" },
  ];
  const missingRequirements = startRequirements.filter((r) => !r.ok).map((r) => r.label);

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

  return (
    <ScreenScaffold
      title={`${strings.production.title} · ${machineTitle(machine)}`}
      toolbar={
        <>
          <OrderStatusBadge vm={vm} />
          <Link href="/production">
            <SecondaryButton icon={ChevronLeft}>К обзору станков</SecondaryButton>
          </Link>
        </>
      }
      wide
    >
      {vm.loading ? (
        <LoadingView />
      ) : vm.phase === "completed" && vm.completionSummary ? (
        <CompletionSummaryCard vm={vm} />
      ) : (
        <div className="space-y-3 pb-2">
          {/* ── Order header (one compact row) ───────────────────────── */}
          <CardView className="p-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4 lg:grid-cols-8">
              <Field label="Материал">
                {locked ? (
                  <StaticValue>{vm.selectedMaterial ? vm.selectedMaterial.code : "—"}</StaticValue>
                ) : (
                  <Select value={vm.materialId} onValueChange={vm.setMaterialId}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue placeholder="Выберите материал" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[min(60vh,var(--radix-select-content-available-height))]">
                      {vm.materials.map((material) => (
                        <SelectItem key={material.id} value={material.id}>
                          {material.code} · {material.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Field>
              <Field label="Заказчик">
                {locked ? (
                  <StaticValue>{vm.order.customer || "—"}</StaticValue>
                ) : (
                  <Input id="order-customer" value={vm.order.customer} onChange={(e) => vm.updateOrder("customer", e.target.value)} className="rounded-2xl" />
                )}
              </Field>
              <Field label="Станок">
                {/* Станок фиксирован экраном — каждый станок ведёт независимый
                    процесс, поэтому здесь он не переключается. */}
                <StaticValue>{machineTitle(vm.order.machine)}</StaticValue>
              </Field>
              <Field label="Оператор">
                {locked ? (
                  <StaticValue>{vm.order.operator || "—"}</StaticValue>
                ) : (
                  <Input id="order-operator" value={vm.order.operator} onChange={(e) => vm.updateOrder("operator", e.target.value)} className="rounded-2xl" />
                )}
              </Field>
              <Field label="Красящий слой">
                {locked ? (
                  <StaticValue>{coatingTitle(vm.order.coating ?? Coating.out)}</StaticValue>
                ) : (
                  <Select value={vm.order.coating ?? Coating.out} onValueChange={(v) => vm.updateOrder("coating", v as Coating)}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {coatingOrder.map((c) => (
                        <SelectItem key={c} value={c}>
                          {coatingTitle(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Field>
              <Field label="Дата">
                <StaticValue>{formatLocalDate(now)}</StaticValue>
              </Field>
              <Field label="Время">
                <StaticValue>{formatLocalTime(now)}</StaticValue>
              </Field>
              <Field label="Статус">
                <div className="flex h-6 items-center">
                  <OrderStatusBadge vm={vm} />
                </div>
              </Field>
            </div>
          </CardView>

          {/* ── Jumbo + nesting parameters + chain (compact info card) ── */}
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
                  Остаток: <span className="font-semibold">{formatMeters(vm.liveRemainderM)}</span> · {remainderPct}%
                </span>
                {!locked ? (
                  <div className="ml-auto">
                    <SecondaryButton icon={PackageSearch} onClick={vm.reset}>
                      Сменить
                    </SecondaryButton>
                  </div>
                ) : null}
              </div>
            ) : !vm.materialId ? (
              <div className={cn(AppTypography.footnote, "text-muted-foreground")}>
                Сначала выберите материал — список Джамбо отфильтруется по нему.
              </div>
            ) : vm.availableJumbos.length === 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={cn(AppTypography.footnote, "text-amber-600 dark:text-amber-400")}>
                  Нет доступных Джамбо материала {vm.selectedMaterial?.code ?? ""}.
                </span>
                <div className="flex items-center gap-2">
                  <SecondaryButton onClick={() => vm.setMaterialId("")}>Выбрать другой материал</SecondaryButton>
                  <Link href="/warehouse/receipt">
                    <PrimaryButton icon={icons.boxes}>Поступление сырья</PrimaryButton>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={cn(AppTypography.footnote, "text-muted-foreground")}>Джамбо не выбран</span>
                <JumboPicker jumbos={vm.availableJumbos} materialNameFor={materialNameFor} onPick={vm.selectJumbo} label="Выбрать Джамбо" />
              </div>
            )}

            <div className="mt-2.5 border-t border-card-border pt-2.5">
              {locked ? (
                <div className={cn(AppTypography.caption, "flex flex-wrap items-center gap-x-4 gap-y-1")}>
                  <span className="text-muted-foreground">Параметры нарезки:</span>
                  <span>Ширина <span className="font-medium text-foreground">{vm.params.rollWidthMm} мм</span></span>
                  <span>Длина <span className="font-medium text-foreground">{vm.params.rollLengthM} м</span></span>
                  <span>Кол-во <span className="font-medium text-foreground">{vm.params.orderRolls} шт.</span></span>
                  <span>Доп. размеры <span className="font-medium text-foreground">{
                    vm.params.additionalAuto
                      ? "авто"
                      : [vm.params.additionalWidthMm, vm.params.additionalWidthMm2].filter(Boolean).map((w) => `${w} мм`).join(" + ") || "—"
                  }</span></span>
                  <span>Назначение <span className="font-medium text-foreground">{vm.params.additionalDestination === RollDestination.order ? "в заказ" : "на склад"}</span></span>
                </div>
              ) : (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="w-24 space-y-1">
                    <Label className="text-[11px]">Ширина, мм</Label>
                    <Input type="number" step="0.1" value={vm.params.rollWidthMm || ""} onChange={(e) => vm.updateParam("rollWidthMm", Number(e.target.value))} className="rounded-2xl" />
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-[11px]">Длина, м</Label>
                    <Input type="number" value={vm.params.rollLengthM || ""} onChange={(e) => vm.updateParam("rollLengthM", Number(e.target.value))} className="rounded-2xl" />
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-[11px]">Кол-во, шт</Label>
                    <Input type="number" value={vm.params.orderRolls || ""} onChange={(e) => vm.updateParam("orderRolls", Number(e.target.value))} className="rounded-2xl" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Доп. размеры</Label>
                    <SegmentedControl options={additionalModeOptions} value={vm.params.additionalAuto ? "auto" : "manual"} onChange={(v) => vm.updateParam("additionalAuto", v === "auto")} aria-label="Режим доп. размеров" />
                  </div>
                  {!vm.params.additionalAuto ? (
                    <>
                      <div className="w-28 space-y-1">
                        <Label className="text-[11px]">Доп. размер №1, мм</Label>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          value={vm.params.additionalWidthMm ?? ""}
                          placeholder="—"
                          onChange={(e) => vm.updateParam("additionalWidthMm", e.target.value === "" ? undefined : Math.max(0, Math.round(Number(e.target.value))) || undefined)}
                          className="rounded-2xl"
                        />
                      </div>
                      <div className="w-28 space-y-1">
                        <Label className="text-[11px]">Доп. размер №2, мм</Label>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          value={vm.params.additionalWidthMm2 ?? ""}
                          placeholder="—"
                          onChange={(e) => vm.updateParam("additionalWidthMm2", e.target.value === "" ? undefined : Math.max(0, Math.round(Number(e.target.value))) || undefined)}
                          className="rounded-2xl"
                        />
                      </div>
                    </>
                  ) : null}
                  <div className="space-y-1">
                    <Label className="text-[11px]">Назначение доп.</Label>
                    <SegmentedControl options={destinationOptions} value={vm.params.additionalDestination} onChange={(v) => vm.updateParam("additionalDestination", v)} aria-label="Назначение дополнительных рулонов" />
                  </div>
                </div>
              )}

              {insufficient ? (
                <>
                  <div className={cn(AppTypography.caption, "mt-2 flex items-start gap-1.5 text-amber-600 dark:text-amber-400")}>
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{PARTIAL_JUMBO_MESSAGE}</span>
                  </div>
                  {/* Следующий Джамбо (зарезервирован) — первый доступный, либо уведомление. */}
                  <div className="mt-1.5 rounded-lg border border-card-border bg-card/50 px-2.5 py-1.5">
                    <div className={cn(AppTypography.caption2, "text-muted-foreground")}>Следующий Джамбо (зарезервирован)</div>
                    {reservedNext ? (
                      <div className={cn(AppTypography.caption, "mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5")}>
                        <span className="font-mono font-semibold">№ {reservedNext.stockNumber}</span>
                        <span>{reservedNext.widthMm} мм · {formatMeters(reservedNext.currentRemainderM)}</span>
                        <span className="text-muted-foreground">{jumboStatusTitle(reservedNext.status)}</span>
                      </div>
                    ) : (
                      <div className={cn(AppTypography.caption, "mt-0.5 text-muted-foreground")}>
                        Резерв отсутствует — оформите поступление сырья.
                      </div>
                    )}
                  </div>
                </>
              ) : vm.planStatus === "error" ? (
                <div className={cn(AppTypography.caption, "mt-2 text-destructive")}>{vm.planError}</div>
              ) : null}

              {vm.selectedJumbo && (locked || vm.chainSteps.length > 0) ? <ChainStrip vm={vm} /> : null}
            </div>
          </CardView>

          {/* ── Main area: KPI + journal (left), operations (right) ──── */}
          <div className="grid gap-3 xl:grid-cols-4">
            <div className="space-y-3 xl:col-span-3">
              <CardView title="Результаты расчёта" icon={icons.dashboard} className="p-3">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  <Tile label="Выход" value={yieldPercent !== null ? `${yieldPercent}%` : "—"} />
                  <Tile label="Отход" value={plan ? `${plan.waste_percent.toFixed(1)}%` : "—"} tone={plan && plan.waste_percent > 7 ? "danger" : undefined} />
                  <Tile label="Циклов" value={plan ? `${plan.cycles_used}` : "—"} />
                  <RollResultTile
                    label="Рулонов (осн.)"
                    count={plan ? plan.total_main_rolls : 0}
                    widthMm={plan ? plan.roll_width_mm : null}
                    tone="main"
                  />
                  <RollResultTile
                    label="Рулонов (доп.)"
                    count={plan ? plan.total_additional_rolls : 0}
                    widthMm={plan && plan.additional_width_mm ? plan.additional_width_mm : null}
                    tone="additional"
                  />
                  <Tile label="Использовано" value={plan ? formatMeters(plan.used_length_m) : "—"} />
                </div>
              </CardView>

              {/* Cutting scheme — the live raskroy for the current plan (compact). */}
              {plan ? (
                <CardView className="p-3">
                  <CuttingVisualizer
                    model={buildCuttingModel(plan)}
                    activeKind={schemeKind}
                    onActiveKindChange={setSchemeKind}
                    compact
                  />
                </CardView>
              ) : null}

              {/* Journal — the main working element of the screen */}
              <CardView title="Журнал операций" icon={icons.gauge} className="p-3">
                {vm.productionLog.length === 0 ? (
                  <div className={cn(AppTypography.caption, "py-6 text-center text-muted-foreground")}>
                    {locked ? "Событий пока нет." : "Журнал заполняется во время производства."}
                  </div>
                ) : (
                  <div className="max-h-[46vh] overflow-auto">
                    <table className="w-full text-left">
                      <thead className="sticky top-0 bg-card">
                        <tr className={cn(AppTypography.caption2, "text-muted-foreground")}>
                          <th className="py-1.5 pr-3 font-medium">Время</th>
                          <th className="py-1.5 pr-3 font-medium">Операция</th>
                          <th className="py-1.5 pr-3 font-medium">Количество</th>
                          <th className="py-1.5 pr-3 font-medium">Описание</th>
                          <th className="py-1.5 font-medium">Оператор</th>
                        </tr>
                      </thead>
                      <tbody className={cn(AppTypography.caption)}>
                        {vm.productionLog.map((entry) => (
                          <tr key={entry.id} className="border-t border-card-border align-top">
                            <td className="py-1.5 pr-3 tabular-nums text-muted-foreground">{timeOf(entry.at)}</td>
                            <td className="py-1.5 pr-3">
                              <span
                                className={cn(
                                  "font-medium",
                                  entry.kind === "defect"
                                    ? "text-destructive"
                                    : entry.kind === "start" || entry.kind === "connect" || entry.kind === "continue"
                                      ? "text-primary"
                                      : entry.kind === "exhausted"
                                        ? "text-[hsl(142_71%_40%)] dark:text-[hsl(142_71%_58%)]"
                                        : "",
                                )}
                              >
                                {LOG_LABEL[entry.kind]}
                              </span>
                            </td>
                            <td className="py-1.5 pr-3 tabular-nums">{journalCount(entry)}</td>
                            <td className="py-1.5 pr-3 text-muted-foreground">{journalDescription(entry)}</td>
                            <td className="py-1.5 text-muted-foreground">{entry.operator ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardView>
            </div>

            {/* Right: operations + bottom stats */}
            <div className="space-y-3">
              <CardView title="Операции" icon={icons.gauge} headerTone="accent" className="p-3">
                <div className="flex flex-col gap-2">
                  {locked ? (
                    <>
                      {/* Semantic colours: оранжевый = внимание/брак, синий =
                          управляющее, зелёный = завершение, красный = опасное. */}
                      <DefectDialog
                        vm={vm}
                        disabled={false}
                        trigger={<OpButton icon={AlertTriangle} color="bg-[#F59E0B] hover:bg-[#D97706]">Добавить брак</OpButton>}
                      />
                      <NextJumboDialog
                        vm={vm}
                        materialNameFor={materialNameFor}
                        trigger={
                          <OpButton icon={Repeat2} color="bg-[#2563EB] hover:bg-[#1D4ED8]" disabled={vm.eligibleForContinue.length === 0 || vm.continuing}>
                            Сменить Джамбо
                          </OpButton>
                        }
                      />
                      {vm.phase === "running" ? (
                        <OpButton icon={Pause} color="bg-[#F97316] hover:bg-[#EA580C]" onClick={vm.pauseProduction}>
                          Приостановить
                        </OpButton>
                      ) : (
                        <OpButton icon={Play} color="bg-[#22C55E] hover:bg-[#16A34A]" onClick={vm.resumeProduction}>
                          Продолжить
                        </OpButton>
                      )}
                      <OpButton icon={CheckCircle2} color="bg-[#16A34A] hover:bg-[#15803D]" loading={vm.finishing} disabled={!vm.canExecute} onClick={() => void onFinish()}>
                        Завершить производство
                      </OpButton>
                      {insufficient ? (
                        <p className={cn(AppTypography.caption, "text-muted-foreground")}>
                          Текущего Джамбо недостаточно для завершения — смените Джамбо, чтобы продолжить заказ.
                        </p>
                      ) : null}
                      <CancelDialog
                        vm={vm}
                        trigger={<OpButton icon={XCircle} color="bg-[#EF4444] hover:bg-[#DC2626]">Отменить производство</OpButton>}
                      />
                    </>
                  ) : (
                    <>
                      <OpButton icon={PlayCircle} color="bg-[#22C55E] hover:bg-[#16A34A]" disabled={!vm.canStart} onClick={onStart}>
                        Начать производство
                      </OpButton>
                      {!vm.canStart && missingRequirements.length > 0 ? (
                        <p className={cn(AppTypography.caption, "text-muted-foreground")}>
                          Для запуска заполните: {missingRequirements.join(", ")}
                        </p>
                      ) : null}
                    </>
                  )}

                  {/* Info hint under the actions. */}
                  <div className="mt-1 flex items-start gap-2 rounded-lg border border-card-border bg-card/50 p-3">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span className={cn(AppTypography.caption, "text-muted-foreground")}>
                      Перед запуском убедитесь, что все параметры корректны.
                    </span>
                  </div>
                </div>
              </CardView>

              {/* Bottom stats — only Брак and Доп. рулоны на склад (progress bar
                  and tech-scrap display removed per the production spec). */}
              <div className="grid grid-cols-2 gap-3">
                <CardView className="p-3">
                  <div className="flex items-center justify-between">
                    <span className={cn(AppTypography.caption2, "text-muted-foreground")}>Брак (тек. Джамбо)</span>
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  </div>
                  <div className={cn(AppTypography.title2, "mt-1 tabular-nums text-destructive")}>{vm.activeDefectCount}</div>
                  <div className={cn(AppTypography.caption, "text-muted-foreground")}>рул. · {formatArea(vm.activeDefectAreaM2)}</div>
                </CardView>
                <CardView className="p-3">
                  <div className="flex items-center justify-between">
                    <span className={cn(AppTypography.caption2, "text-muted-foreground")}>Доп. рулоны на склад</span>
                    <PackageSearch className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className={cn(AppTypography.title2, "mt-1 tabular-nums")}>{additionalToWarehouse}</div>
                  <div className={cn(AppTypography.caption, "text-muted-foreground")}>шт. · по текущему расчёту</div>
                </CardView>
              </div>
            </div>
          </div>
        </div>
      )}
    </ScreenScaffold>
  );
}
