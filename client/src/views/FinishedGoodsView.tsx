import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  Download,
  Eye,
  History as HistoryIcon,
  MoveRight,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  EmptyState,
  KpiCard,
  LoadingView,
  PrimaryButton,
  ScreenScaffold,
  SearchBar,
  SecondaryButton,
  SegmentedControl,
  StatusBadge,
  type SegmentOption,
} from "@/components";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Coating,
  coatingTitle,
  finishedRollStatusColorRole,
  finishedRollStatusOrder,
  finishedRollStatusTitle,
  FinishedRollStatus,
  machineTitle,
  type FinishedRoll,
  type Machine,
} from "@/models";
import {
  useFinishedGoodsViewModel,
  type FinishedGoodsCoatingFilter,
  type FinishedGoodsFilters,
  type FinishedGoodsStatusFilter,
} from "@/viewmodels";

type FinishedGoodsVM = ReturnType<typeof useFinishedGoodsViewModel>;

/** Sentinel for the "no filter" option (Radix Select forbids an empty value). */
const ALL = "__all__";

type SortKey = "date" | "number" | "material" | "status";
const sortOptions: ReadonlyArray<SegmentOption<SortKey>> = [
  { value: "date", label: "По дате" },
  { value: "number", label: "По номеру" },
  { value: "material", label: "По материалу" },
  { value: "status", label: "По статусу" },
];

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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
      <FilterSelect
        label="Материал"
        value={vm.filters.materialId}
        onChange={set("materialId")}
        options={vm.options.materials.map((material) => ({ value: material.id, label: material.code }))}
      />
      <FilterSelect
        label="Слой"
        value={vm.filters.coating === "all" ? "" : vm.filters.coating}
        onChange={(v) => vm.setFilter("coating", (v === "" ? "all" : v) as FinishedGoodsCoatingFilter)}
        options={[Coating.in, Coating.out].map((c) => ({ value: c, label: coatingTitle(c) }))}
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
    </div>
  );
}

/** Edit-comment dialog. */
function EditDialog({ vm, roll, open, onOpenChange }: { vm: FinishedGoodsVM; roll: FinishedRoll; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [comment, setComment] = useState(roll.comment ?? "");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Рулон {roll.number}: комментарий</DialogTitle>
        </DialogHeader>
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Комментарий" className="rounded-2xl" />
        <DialogFooter>
          <SecondaryButton onClick={() => onOpenChange(false)}>Отмена</SecondaryButton>
          <PrimaryButton onClick={() => { void vm.updateComment(roll.id, comment.trim(), roll.operator); onOpenChange(false); }}>Сохранить</PrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Relocate dialog. */
function MoveDialog({ vm, roll, open, onOpenChange }: { vm: FinishedGoodsVM; roll: FinishedRoll; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [location, setLocation] = useState(roll.storageLocation ?? "");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Переместить рулон {roll.number}</DialogTitle>
        </DialogHeader>
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Место хранения (напр. Стеллаж A-3)" className="rounded-2xl" />
        <DialogFooter>
          <SecondaryButton onClick={() => onOpenChange(false)}>Отмена</SecondaryButton>
          <PrimaryButton onClick={() => { void vm.relocate(roll.id, location.trim(), roll.operator); onOpenChange(false); }}>Переместить</PrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Write-off confirm dialog. */
function WriteOffDialog({ vm, roll, open, onOpenChange }: { vm: FinishedGoodsVM; roll: FinishedRoll; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [note, setNote] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Списать рулон {roll.number}?</DialogTitle>
        </DialogHeader>
        <p className={cn(AppTypography.footnote, "text-muted-foreground")}>
          Рулон получит статус «Списан» и покинет свободный остаток, но останется в истории.
        </p>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Причина (необязательно)" className="rounded-2xl" />
        <DialogFooter>
          <SecondaryButton onClick={() => onOpenChange(false)}>Отмена</SecondaryButton>
          <Button variant="destructive" className="rounded-2xl" onClick={() => { void vm.writeOff(roll.id, roll.operator, note.trim()); onOpenChange(false); }}>Списать</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Compact action button used on the card footer. */
function CardAction({ icon: Icon, label, onClick, danger, href }: { icon: typeof Eye; label: string; onClick?: () => void; danger?: boolean; href?: string }) {
  const inner = (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn("h-7 gap-1 rounded-lg px-2 text-xs", danger ? "text-destructive hover:text-destructive" : "text-muted-foreground")}
      aria-label={label}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function RollCard({ vm, roll }: { vm: FinishedGoodsVM; roll: FinishedRoll }) {
  const [dialog, setDialog] = useState<"edit" | "move" | "writeoff" | null>(null);
  const role = finishedRollStatusColorRole(roll.status);
  const metric = (label: string, value: string) => (
    <div className="min-w-0">
      <div className={cn(AppTypography.caption2, "text-muted-foreground")}>{label}</div>
      <div className={cn(AppTypography.footnote, "truncate tabular-nums font-medium")}>{value}</div>
    </div>
  );
  return (
    <div className="glass noise rounded-2xl border border-card-border p-3 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold tabular-nums leading-tight">{roll.number}</div>
          <div className={cn(AppTypography.caption, "truncate text-muted-foreground")}>
            {roll.materialCode}{roll.coating ? ` · ${coatingTitle(roll.coating)}` : ""}
          </div>
        </div>
        <StatusBadge label={finishedRollStatusTitle(roll.status)} tone={role} />
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        {metric("Ширина", `${roll.widthMm} мм`)}
        {metric("Длина", `${roll.lengthM} м`)}
        {metric("Дата", formatDate(roll.producedAt))}
        {metric("Заказ", roll.orderNumber || "—")}
        {metric("Джамбо", roll.jumboStockNumber || "—")}
        {metric("Станок", machineTitle(roll.machine))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {metric("Оператор", roll.operator || "—")}
        {metric("Место", roll.storageLocation || "—")}
      </div>
      {roll.comment ? (
        <div className={cn(AppTypography.caption, "mt-2 truncate text-muted-foreground")} title={roll.comment}>
          💬 {roll.comment}
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-0.5 border-t border-card-border pt-2">
        <CardAction icon={Eye} label="Просмотр" href={`/finished-goods/${roll.id}`} />
        <CardAction icon={Pencil} label="Изменить" onClick={() => setDialog("edit")} />
        <CardAction icon={MoveRight} label="Переместить" onClick={() => setDialog("move")} />
        <CardAction icon={Printer} label="Этикетка" href={`/finished-goods/${roll.id}/label`} />
        <CardAction icon={HistoryIcon} label="История" href={`/finished-goods/${roll.id}`} />
        {roll.status !== FinishedRollStatus.writtenOff ? (
          <CardAction icon={Trash2} label="Списать" danger onClick={() => setDialog("writeoff")} />
        ) : null}
      </div>

      {dialog === "edit" ? <EditDialog vm={vm} roll={roll} open onOpenChange={(v) => !v && setDialog(null)} /> : null}
      {dialog === "move" ? <MoveDialog vm={vm} roll={roll} open onOpenChange={(v) => !v && setDialog(null)} /> : null}
      {dialog === "writeoff" ? <WriteOffDialog vm={vm} roll={roll} open onOpenChange={(v) => !v && setDialog(null)} /> : null}
    </div>
  );
}

/**
 * Finished-goods warehouse (Склад готовых рулонов) — a card catalogue of every
 * produced roll. A separate warehouse from the material (Jumbo) stock: here each
 * unit is an already-made roll of product, filled automatically by the
 * production module on order completion (manual creation is not allowed).
 */
export function FinishedGoodsView() {
  const vm = useFinishedGoodsViewModel();
  const [sort, setSort] = useState<SortKey>("date");

  const statusOptions: ReadonlyArray<SegmentOption<FinishedGoodsStatusFilter>> = [
    { value: "all", label: "Все", badge: vm.statusCounts.all },
    ...finishedRollStatusOrder.map((status) => ({
      value: status,
      label: finishedRollStatusTitle(status),
      badge: vm.statusCounts[status],
    })),
  ];

  const rolls = useMemo(() => {
    const copy = [...vm.rolls];
    switch (sort) {
      case "number":
        return copy.sort((a, b) => a.number.localeCompare(b.number));
      case "material":
        return copy.sort((a, b) => a.materialCode.localeCompare(b.materialCode) || b.producedAt.localeCompare(a.producedAt));
      case "status":
        return copy.sort((a, b) => a.status.localeCompare(b.status) || b.producedAt.localeCompare(a.producedAt));
      case "date":
      default:
        return copy.sort((a, b) => b.producedAt.localeCompare(a.producedAt));
    }
  }, [vm.rolls, sort]);

  const exportCsv = () => {
    const csv = vm.buildCsv();
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finished-goods-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <ScreenScaffold
      title="Склад готовых рулонов"
      wide
      toolbar={
        <>
          <SecondaryButton icon={Download} onClick={exportCsv} disabled={vm.totalCount === 0}>
            Экспорт
          </SecondaryButton>
          <Link href="/production">
            <PrimaryButton icon={Plus}>Новая партия</PrimaryButton>
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        {/* Analytics strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="Всего рулонов" value={String(vm.analytics.total)} icon={icons.boxes} />
          <KpiCard label="Свободно" value={String(vm.analytics.free)} />
          <KpiCard label="В резерве" value={String(vm.analytics.reserved)} />
          <KpiCard label="Отгружено" value={String(vm.analytics.shipped)} />
          <KpiCard label="Общая длина" value={String(vm.analytics.totalLengthM)} unit="м" />
          <KpiCard label="Общая площадь" value={String(vm.analytics.totalAreaM2)} unit="м²" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="В заказе" value={String(vm.analytics.inOrder)} />
          <KpiCard label="Списано" value={String(vm.analytics.writtenOff)} />
          <KpiCard label="Слой IN" value={String(vm.analytics.inCount)} />
          <KpiCard label="Слой OUT" value={String(vm.analytics.outCount)} />
        </div>

        <SearchBar
          value={vm.query}
          onChange={vm.setQuery}
          placeholder="№ рулона, заказ, материал, Джамбо, оператор, комментарий"
        />
        <SegmentedControl options={statusOptions} value={vm.status} onChange={vm.setStatus} aria-label="Фильтр по статусу" />
        <FiltersPanel vm={vm} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SegmentedControl options={sortOptions} value={sort} onChange={setSort} aria-label="Сортировка" />
          {vm.hasActiveFilters ? (
            <div className="flex items-center gap-2">
              <span className={cn(AppTypography.caption, "text-muted-foreground")}>Показано {vm.rolls.length} из {vm.totalCount}</span>
              <SecondaryButton icon={RotateCcw} onClick={vm.resetFilters}>Сбросить</SecondaryButton>
            </div>
          ) : null}
        </div>

        {vm.loading ? (
          <LoadingView />
        ) : rolls.length === 0 ? (
          <EmptyState
            icon={icons.boxes}
            title={vm.totalCount === 0 ? "Склад пуст" : "Ничего не найдено"}
            message={
              vm.totalCount === 0
                ? "Готовые рулоны появляются здесь автоматически после завершения производственного заказа."
                : "Измените фильтры или строку поиска."
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rolls.map((roll) => (
              <RollCard key={roll.id} vm={vm} roll={roll} />
            ))}
          </div>
        )}
      </div>
    </ScreenScaffold>
  );
}
