import { useLocation } from "wouter";
import { RotateCcw } from "lucide-react";
import {
  EmptyState,
  KpiCard,
  LoadingView,
  ScreenScaffold,
  SearchBar,
  SecondaryButton,
  SegmentedControl,
  StatusBadge,
  type SegmentOption,
} from "@/components";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { icons } from "@/resources/icons";
import { AppTypography } from "@/designsystem";
import {
  finishedRollStatusColorRole,
  finishedRollStatusOrder,
  finishedRollStatusTitle,
  machineTitle,
  type FinishedRoll,
  type Machine,
} from "@/models";
import {
  useFinishedGoodsViewModel,
  type FinishedGoodsFilters,
  type FinishedGoodsStatusFilter,
} from "@/viewmodels";

type FinishedGoodsVM = ReturnType<typeof useFinishedGoodsViewModel>;

/** Sentinel for the "no filter" option (Radix Select forbids an empty value). */
const ALL = "__all__";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("ru-RU");
}

/** One labelled dropdown filter with an "Все" reset option. */
function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="min-w-0 space-y-1">
      <span className={cn(AppTypography.caption2, "text-muted-foreground")}>{label}</span>
      <Select value={value === "" ? ALL : value} onValueChange={(next) => onChange(next === ALL ? "" : next)}>
        <SelectTrigger className="h-8 rounded-xl">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-[min(60vh,var(--radix-select-content-available-height))]">
          <SelectItem value={ALL}>Все</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function FiltersPanel({ vm }: { vm: FinishedGoodsVM }) {
  const set = <K extends keyof FinishedGoodsFilters>(key: K) => (value: string) =>
    vm.setFilter(key, value as FinishedGoodsFilters[K]);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      <FilterSelect
        label="Материал"
        value={vm.filters.materialId}
        onChange={set("materialId")}
        options={vm.options.materials.map((material) => ({ value: material.id, label: material.code }))}
      />
      <FilterSelect
        label="Ширина"
        value={vm.filters.widthMm}
        onChange={set("widthMm")}
        options={vm.options.widths.map((width) => ({ value: String(width), label: `${width} мм` }))}
      />
      <FilterSelect
        label="Длина"
        value={vm.filters.lengthM}
        onChange={set("lengthM")}
        options={vm.options.lengths.map((length) => ({ value: String(length), label: `${length} м` }))}
      />
      <FilterSelect
        label="Дата"
        value={vm.filters.date}
        onChange={set("date")}
        options={vm.options.dates.map((date) => ({ value: date, label: formatDate(date) }))}
      />
      <FilterSelect
        label="Заказ"
        value={vm.filters.orderNumber}
        onChange={set("orderNumber")}
        options={vm.options.orders.map((order) => ({ value: order, label: order }))}
      />
      <FilterSelect
        label="Оператор"
        value={vm.filters.operator}
        onChange={set("operator")}
        options={vm.options.operators.map((operator) => ({ value: operator, label: operator }))}
      />
      <FilterSelect
        label="Станок"
        value={vm.filters.machine}
        onChange={set("machine")}
        options={vm.options.machines.map((machine) => ({ value: machine, label: machineTitle(machine as Machine) }))}
      />
    </div>
  );
}

const columns = [
  "№ рулона",
  "Материал",
  "Ширина",
  "Длина",
  "Дата",
  "Заказ",
  "Джамбо",
  "Станок",
  "Оператор",
  "Статус",
] as const;

function RollRow({ roll, onOpen }: { roll: FinishedRoll; onOpen: () => void }) {
  const role = finishedRollStatusColorRole(roll.status);
  const cell = "whitespace-nowrap px-3 py-2 text-sm";
  return (
    <tr
      onClick={onOpen}
      className="cursor-pointer border-t border-border/60 transition-colors hover:bg-muted/50"
    >
      <td className={cn(cell, "font-medium tabular-nums")}>{roll.number}</td>
      <td className={cell}>{roll.materialCode}</td>
      <td className={cn(cell, "tabular-nums")}>{roll.widthMm} мм</td>
      <td className={cn(cell, "tabular-nums")}>{roll.lengthM} м</td>
      <td className={cn(cell, "tabular-nums text-muted-foreground")}>{formatDate(roll.producedAt)}</td>
      <td className={cn(cell, "tabular-nums")}>{roll.orderNumber || "—"}</td>
      <td className={cn(cell, "tabular-nums")}>{roll.jumboStockNumber || "—"}</td>
      <td className={cell}>{machineTitle(roll.machine)}</td>
      <td className={cell}>{roll.operator || "—"}</td>
      <td className={cell}>
        <StatusBadge label={finishedRollStatusTitle(roll.status)} tone={role} />
      </td>
    </tr>
  );
}

/**
 * Finished-goods warehouse (Готовая продукция) — the ledger of every produced
 * roll. A separate warehouse from the material (Jumbo) stock: here each unit is
 * an already-made roll of product. Rows are automatically filled by the
 * production module on order completion.
 */
export function FinishedGoodsView() {
  const vm = useFinishedGoodsViewModel();
  const [, navigate] = useLocation();

  const statusOptions: ReadonlyArray<SegmentOption<FinishedGoodsStatusFilter>> = [
    { value: "all", label: "Все", badge: vm.statusCounts.all },
    ...finishedRollStatusOrder.map((status) => ({
      value: status,
      label: finishedRollStatusTitle(status),
      badge: vm.statusCounts[status],
    })),
  ];

  return (
    <ScreenScaffold title="Готовая продукция" wide>
      <div className="space-y-4">
        {/* Analytics strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard label="Всего рулонов" value={String(vm.analytics.total)} icon={icons.boxes} />
          <KpiCard label="В заказе" value={String(vm.analytics.inOrder)} />
          <KpiCard label="На складе" value={String(vm.analytics.inStock)} />
          <KpiCard label="В резерве" value={String(vm.analytics.reserved)} />
          <KpiCard label="Отгружено" value={String(vm.analytics.shipped)} />
        </div>

        <SearchBar
          value={vm.query}
          onChange={vm.setQuery}
          placeholder="№ рулона, заказ, материал, Джамбо"
        />
        <SegmentedControl
          options={statusOptions}
          value={vm.status}
          onChange={vm.setStatus}
          aria-label="Фильтр по статусу"
        />
        <FiltersPanel vm={vm} />
        {vm.hasActiveFilters ? (
          <div className="flex items-center justify-between gap-2">
            <span className={cn(AppTypography.caption, "text-muted-foreground")}>
              Показано {vm.rolls.length} из {vm.totalCount}
            </span>
            <SecondaryButton icon={RotateCcw} onClick={vm.resetFilters}>
              Сбросить
            </SecondaryButton>
          </div>
        ) : null}

        {vm.loading ? (
          <LoadingView />
        ) : vm.rolls.length === 0 ? (
          <EmptyState
            icon={icons.boxes}
            title={vm.totalCount === 0 ? "Склад пуст" : "Ничего не найдено"}
            message={
              vm.totalCount === 0
                ? "Готовые рулоны появятся автоматически после завершения производственного заказа."
                : "Измените фильтры или строку поиска."
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-card-border">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/40">
                  {columns.map((column) => (
                    <th
                      key={column}
                      className={cn(AppTypography.caption2, "whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground")}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vm.rolls.map((roll) => (
                  <RollRow key={roll.id} roll={roll} onOpen={() => navigate(`/finished-goods/${roll.id}`)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ScreenScaffold>
  );
}
