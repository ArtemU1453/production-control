import { useState } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Pause,
  Play,
  PlayCircle,
} from "lucide-react";
import {
  CardView,
  LoadingView,
  PrimaryButton,
  ScreenScaffold,
  SecondaryButton,
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
  coatingTitle,
  machineTitle,
  type Jumbo,
} from "@/models";
import { formatMeters } from "@/extensions/number";
import { useProductionViewModel } from "@/viewmodels";
import {
  CancelDialog,
  DefectDialog,
  LOG_LABEL,
  NextJumboDialog,
  Tile,
  deriveMachineStats,
  timeOf,
} from "./ProductionView";
import { CuttingVisualizer, buildCuttingModel, type StripeKind } from "./calculator";

type ProductionVM = ReturnType<typeof useProductionViewModel>;

/** Path to a machine's full detail screen. */
function detailPath(machine: Machine): string {
  return `/production/${machine}`;
}

/** Operator-facing customer name for the order. The technical order number
 *  (ORD-…) stays in the data (order.orderNumber) — it is surfaced only as a
 *  tooltip / in «Детали», never as the primary field. Falls back to «Не указан»
 *  for legacy orders saved without a customer. */
function customerName(order: { customer: string }): string {
  const name = order.customer?.trim();
  return name && name.length > 0 ? name : "Не указан";
}

/** Uppercase machine-status meta per the mockup (В РАБОТЕ / ПАУЗА / ОЖИДАНИЕ /
 *  ЗАВЕРШЁН) with the shared green/amber colour code. */
function statusMeta(phase: ProductionVM["phase"]): { label: string; dot: string; tone: string } {
  switch (phase) {
    case "running":
      return {
        label: "В РАБОТЕ",
        dot: "bg-[hsl(142_71%_45%)]",
        tone: "text-[hsl(142_71%_38%)] dark:text-[hsl(142_71%_60%)]",
      };
    case "paused":
      return {
        label: "ПАУЗА",
        dot: "bg-[hsl(38_92%_50%)]",
        tone: "text-[hsl(38_92%_40%)] dark:text-[hsl(38_92%_62%)]",
      };
    case "completed":
      return { label: "ЗАВЕРШЁН", dot: "bg-primary", tone: "text-primary" };
    default:
      return { label: "ОЖИДАНИЕ", dot: "bg-muted-foreground", tone: "text-muted-foreground" };
  }
}

/** IN (blue) / OUT (red) coating badge. */
function CoatingBadge({ coating }: { coating: Coating }) {
  const isIn = coating === Coating.in;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
        isIn ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" : "bg-destructive/15 text-destructive",
      )}
    >
      {coatingTitle(coating)}
    </span>
  );
}

/** A compact labelled read-only cell used inside the machine card. */
function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className={cn(AppTypography.caption2, "text-muted-foreground")}>{label}</div>
      <div className={cn(AppTypography.footnote, "truncate font-medium")}>{children ?? "—"}</div>
    </div>
  );
}

/** Live status pill + «Детали ↗» — shared header for every machine card. */
function MachineCardHeader({ vm, machine }: { vm: ProductionVM; machine: Machine }) {
  const meta = statusMeta(vm.phase);
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <span className={cn(AppTypography.headline, "font-semibold")}>{machineTitle(machine).toUpperCase()}</span>
        <span
          className={cn(
            AppTypography.caption,
            "inline-flex items-center gap-1.5 rounded-full bg-card/70 px-2 py-0.5 font-semibold",
            meta.tone,
          )}
        >
          <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
          {meta.label}
        </span>
      </div>
      <Link href={detailPath(machine)}>
        <button
          type="button"
          className={cn(
            AppTypography.caption,
            "inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-primary transition-colors hover:bg-primary/10",
          )}
        >
          Детали
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </Link>
    </div>
  );
}

/** The idle («ОЖИДАНИЕ») body: nothing is running on this machine yet. */
function IdleBody({ machine }: { machine: Machine }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/40 text-muted-foreground">
        <PlayCircle className="h-6 w-6" />
      </div>
      <div className={cn(AppTypography.footnote, "text-muted-foreground")}>
        Станок свободен — активного заказа нет.
      </div>
      <Link href={detailPath(machine)}>
        <PrimaryButton icon={PlayCircle}>Настроить и запустить</PrimaryButton>
      </Link>
    </div>
  );
}

/** The completed body: a compact result summary + «Новый заказ». */
function CompletedBody({ vm, machine }: { vm: ProductionVM; machine: Machine }) {
  const s = vm.completionSummary;
  if (!s) {
    // Completed phase without a stored summary (e.g. just after a reload) —
    // fall back to the idle affordance so the machine is never stuck.
    return <IdleBody machine={machine} />;
  }
  return (
    <div className="space-y-3">
      <div className={cn(AppTypography.footnote, "font-medium")}>
        {customerName(s)}
        {s.orderNumber ? (
          <span className="ml-1.5 font-normal text-muted-foreground">· Заказ № {s.orderNumber}</span>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Tile label="Заказ" value={`${s.targetRolls} шт.`} />
        <Tile label="Годных" value={`${s.goodRolls} шт.`} />
        <Tile label="По заказу" value={`${s.orderDeliveredRolls} шт.`} />
        {s.warehouseSurplusRolls > 0 ? <Tile label="На склад" value={`${s.warehouseSurplusRolls} шт.`} /> : null}
        <Tile label="Брак" value={`${s.defects} шт.`} tone={s.defects > 0 ? "danger" : undefined} />
        <Tile label="Использовано" value={formatMeters(s.usedMaterialM)} />
      </div>
      <SecondaryButton fullWidth icon={PlayCircle} onClick={vm.newOrder}>
        Новый заказ
      </SecondaryButton>
    </div>
  );
}

/** The active body (running / paused): full production detail + actions. */
function ActiveBody({ vm, machine }: { vm: ProductionVM; machine: Machine }) {
  const { toast } = useToast();
  const stats = deriveMachineStats(vm);
  const plan = stats.plan;
  const [schemeKind, setSchemeKind] = useState<StripeKind | null>(null);
  const insufficient = vm.planStatus === "insufficient";
  const materialNameFor = (jumbo: Jumbo) => vm.materialsById.get(jumbo.materialId)?.name ?? "—";
  const coating = vm.order.coating ?? Coating.out;
  const startedDate = vm.startedAt ? new Date(vm.startedAt) : null;
  const journalPreview = vm.productionLog.slice(0, 4);
  const additionalLabel = vm.params.additionalAuto
    ? "авто"
    : [vm.params.additionalWidthMm, vm.params.additionalWidthMm2]
        .filter(Boolean)
        .map((w) => `${w} мм`)
        .join(" + ") || "—";

  const onFinish = async () => {
    const outcome = await vm.finishProduction();
    if (outcome) {
      toast({ title: strings.production.successNotice });
    }
  };

  return (
    <div className="space-y-3">
      {/* Order / material / operator */}
      <div className="grid grid-cols-3 gap-x-3 gap-y-2">
        <Cell label="Заказчик">
          <span title={`Заказ № ${vm.order.orderNumber}`}>{customerName(vm.order)}</span>
        </Cell>
        <Cell label="Материал">{vm.selectedMaterial ? vm.selectedMaterial.code : "—"}</Cell>
        <Cell label="Оператор">{vm.order.operator || "—"}</Cell>
        <Cell label="Джамбо">{vm.selectedJumbo ? `№ ${vm.selectedJumbo.stockNumber}` : "—"}</Cell>
        <Cell label="Кр. слой">
          <CoatingBadge coating={coating} />
        </Cell>
        <Cell label="Дата запуска">
          {startedDate ? `${startedDate.toLocaleDateString("ru-RU")} ${timeOf(vm.startedAt as string)}` : "—"}
        </Cell>
      </div>

      {/* Cutting parameters */}
      <div className="rounded-lg border border-card-border bg-card/50 px-2.5 py-2">
        <div className={cn(AppTypography.caption2, "mb-1 text-muted-foreground")}>Параметры нарезки</div>
        <div className={cn(AppTypography.caption, "flex flex-wrap items-center gap-x-4 gap-y-1")}>
          <span>Ширина <span className="font-medium text-foreground">{vm.params.rollWidthMm} мм</span></span>
          <span>Намотка <span className="font-medium text-foreground">{vm.params.rollLengthM} м</span></span>
          <span>Количество <span className="font-medium text-foreground">{stats.target} шт.</span></span>
          <span>Доп. размеры <span className="font-medium text-foreground">{additionalLabel}</span></span>
        </div>
      </div>

      {/* Cutting scheme — the live raskroy for this machine's plan. */}
      {plan ? (
        <CuttingVisualizer
          model={buildCuttingModel(plan)}
          activeKind={schemeKind}
          onActiveKindChange={setSchemeKind}
        />
      ) : null}

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        <Tile label="Выход" value={stats.yieldPercent !== null ? `${stats.yieldPercent}%` : "—"} />
        <Tile
          label="Отход"
          value={plan ? `${plan.waste_percent.toFixed(1)}%` : "—"}
          tone={plan && plan.waste_percent > 7 ? "danger" : undefined}
        />
        <Tile label="Выполнено" value={`${stats.doneRolls}/${stats.target}`} />
        <Tile label="Осталось" value={`${stats.remainingRolls} шт.`} />
        <Tile label="Брак" value={`${vm.defectCount} шт.`} tone={vm.defectCount > 0 ? "danger" : undefined} />
      </div>

      {/* Next Jumbo */}
      <div className="flex items-center justify-between gap-2 rounded-lg border border-card-border bg-card/50 px-2.5 py-1.5">
        <span className={cn(AppTypography.caption2, "text-muted-foreground")}>Следующий Джамбо</span>
        {stats.reservedNext ? (
          <span className={cn(AppTypography.caption, "font-medium")}>
            № {stats.reservedNext.stockNumber} · {formatMeters(stats.reservedNext.currentRemainderM)}
          </span>
        ) : (
          <span className={cn(AppTypography.caption, "text-muted-foreground")}>—</span>
        )}
      </div>

      {/* Journal preview */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className={cn(AppTypography.caption2, "text-muted-foreground")}>Журнал</span>
          <Link href={detailPath(machine)}>
            <span className={cn(AppTypography.caption, "inline-flex items-center gap-1 font-medium text-primary")}>
              Открыть полный журнал
              <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        </div>
        {journalPreview.length === 0 ? (
          <div className={cn(AppTypography.caption, "py-2 text-center text-muted-foreground")}>Событий пока нет.</div>
        ) : (
          <ul className="space-y-0.5">
            {journalPreview.map((entry) => (
              <li key={entry.id} className={cn(AppTypography.caption, "flex items-center gap-2")}>
                <span className="tabular-nums text-muted-foreground">{timeOf(entry.at)}</span>
                <span className={cn("font-medium", entry.kind === "defect" ? "text-destructive" : "")}>
                  {LOG_LABEL[entry.kind]}
                </span>
                {entry.note ? <span className="truncate text-muted-foreground">· {entry.note}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 border-t border-card-border pt-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <DefectDialog vm={vm} disabled={false} />
          <NextJumboDialog vm={vm} materialNameFor={materialNameFor} />
          {vm.phase === "running" ? (
            <SecondaryButton icon={Pause} className="h-9 justify-start" onClick={vm.pauseProduction}>
              Пауза
            </SecondaryButton>
          ) : (
            <SecondaryButton icon={Play} className="h-9 justify-start" onClick={vm.resumeProduction}>
              Продолжить
            </SecondaryButton>
          )}
        </div>
        <PrimaryButton
          icon={CheckCircle2}
          className="h-11 text-base"
          fullWidth
          loading={vm.finishing}
          disabled={!vm.canExecute}
          onClick={() => void onFinish()}
        >
          Завершить производство
        </PrimaryButton>
        {insufficient ? (
          <p className={cn(AppTypography.caption, "flex items-start gap-1.5 text-amber-600 dark:text-amber-400")}>
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Текущего Джамбо недостаточно для завершения — смените Джамбо, чтобы продолжить заказ.
          </p>
        ) : null}
        <CancelDialog vm={vm} />
      </div>
    </div>
  );
}

/** One machine's card — dispatches to the body matching its lifecycle phase. */
function MachineCard({ vm, machine }: { vm: ProductionVM; machine: Machine }) {
  return (
    <CardView className="p-3">
      <MachineCardHeader vm={vm} machine={machine} />
      <div className="mt-3">
        {vm.loading ? (
          <div className="py-10">
            <LoadingView />
          </div>
        ) : vm.phase === "running" || vm.phase === "paused" ? (
          <ActiveBody vm={vm} machine={machine} />
        ) : vm.phase === "completed" ? (
          <CompletedBody vm={vm} machine={machine} />
        ) : (
          <IdleBody machine={machine} />
        )}
      </div>
    </CardView>
  );
}

/** «ЗАКАЗЫ В РАБОТЕ» — a single table aggregating the active order on each
 *  machine (running / paused). Idle and completed machines are omitted. */
function OrdersInWorkTable({ machines }: { machines: { vm: ProductionVM; machine: Machine }[] }) {
  const rows = machines.filter(({ vm }) => vm.phase === "running" || vm.phase === "paused");
  return (
    <CardView title="Заказы в работе" icon={icons.gauge} className="p-3">
      {rows.length === 0 ? (
        <div className={cn(AppTypography.caption, "py-6 text-center text-muted-foreground")}>
          Нет заказов в работе.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className={cn(AppTypography.caption2, "text-muted-foreground")}>
                <th className="py-1.5 pr-3 font-medium">Станок</th>
                <th className="py-1.5 pr-3 font-medium">Заказчик</th>
                <th className="py-1.5 pr-3 font-medium">Материал</th>
                <th className="py-1.5 pr-3 font-medium">Джамбо</th>
                <th className="py-1.5 pr-3 font-medium">Кр. слой</th>
                <th className="py-1.5 pr-3 font-medium">Выполнено</th>
                <th className="py-1.5 pr-3 font-medium">Осталось</th>
                <th className="py-1.5 pr-3 font-medium">Выход</th>
                <th className="py-1.5 pr-3 font-medium">Статус</th>
                <th className="py-1.5 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody className={cn(AppTypography.caption)}>
              {rows.map(({ vm, machine }) => {
                const stats = deriveMachineStats(vm);
                const meta = statusMeta(vm.phase);
                return (
                  <tr key={machine} className="border-t border-card-border align-middle">
                    <td className="py-1.5 pr-3 font-medium">{machineTitle(machine)}</td>
                    <td className="py-1.5 pr-3" title={`Заказ № ${vm.order.orderNumber}`}>
                      {customerName(vm.order)}
                    </td>
                    <td className="py-1.5 pr-3">{vm.selectedMaterial ? vm.selectedMaterial.code : "—"}</td>
                    <td className="py-1.5 pr-3">{vm.selectedJumbo ? `№ ${vm.selectedJumbo.stockNumber}` : "—"}</td>
                    <td className="py-1.5 pr-3">
                      <CoatingBadge coating={vm.order.coating ?? Coating.out} />
                    </td>
                    <td className="py-1.5 pr-3 tabular-nums">
                      {stats.doneRolls}/{stats.target}
                    </td>
                    <td className="py-1.5 pr-3 tabular-nums">{stats.remainingRolls} шт.</td>
                    <td className="py-1.5 pr-3 tabular-nums">
                      {stats.yieldPercent !== null ? `${stats.yieldPercent}%` : "—"}
                    </td>
                    <td className="py-1.5 pr-3">
                      <span className={cn("inline-flex items-center gap-1.5 font-semibold", meta.tone)}>
                        <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="py-1.5">
                      <Link href={detailPath(machine)}>
                        <span className={cn("inline-flex items-center gap-1 font-medium text-primary")}>
                          Детали
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </CardView>
  );
}

/**
 * Production overview — shows both machines side by side (Станок №1 and №2) as
 * two independent columns, with a «Заказы в работе» table below. Each machine is
 * driven by its own ViewModel instance keyed to that machine, so one machine's
 * order, Jumbo, journal and statistics never affect the other, and each survives
 * tab navigation and page reload via its own persisted snapshot.
 */
export function ProductionOverviewView() {
  const vm1 = useProductionViewModel(Machine.machine1);
  const vm2 = useProductionViewModel(Machine.machine2);
  const machines = [
    { vm: vm1, machine: Machine.machine1 },
    { vm: vm2, machine: Machine.machine2 },
  ];

  return (
    <ScreenScaffold title={strings.production.title} subtitle="Станок №1 и Станок №2 — независимые процессы" wide>
      <div className="space-y-3 pb-2">
        <div className="grid gap-3 lg:grid-cols-2">
          {machines.map(({ vm, machine }) => (
            <MachineCard key={machine} vm={vm} machine={machine} />
          ))}
        </div>
        <OrdersInWorkTable machines={machines} />
      </div>
    </ScreenScaffold>
  );
}
