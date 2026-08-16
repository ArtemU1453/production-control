import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import {
  EmptyState,
  LoadingView,
  PrimaryButton,
  SearchBar,
  SecondaryButton,
  StatusBadge,
} from "@/components";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  FinishedRollStatus,
  coatingTitle,
  type Material,
  type StatusColorRole,
} from "@/models";
import {
  PAGE_SIZE_OPTIONS,
  useFinishedGoodsViewModel,
  type FinishedGoodsRow,
} from "@/viewmodels";

type FinishedGoodsVM = ReturnType<typeof useFinishedGoodsViewModel>;

/** Warehouse-facing status labels (per the mockup). */
const STATUS_LABEL: Record<FinishedRollStatus, string> = {
  [FinishedRollStatus.inStock]: "В наличии",
  [FinishedRollStatus.inOrder]: "В заказе",
  [FinishedRollStatus.reserved]: "Зарезервирован",
  [FinishedRollStatus.shipped]: "Отгружен",
  [FinishedRollStatus.writtenOff]: "Списан",
};
const STATUS_TONE: Record<FinishedRollStatus, StatusColorRole> = {
  [FinishedRollStatus.inStock]: "neutral",
  [FinishedRollStatus.inOrder]: "neutral",
  [FinishedRollStatus.reserved]: "warning",
  [FinishedRollStatus.shipped]: "muted",
  [FinishedRollStatus.writtenOff]: "danger",
};

/** Status filter options shown in the mockup. */
const STATUS_FILTERS: { value: "all" | FinishedRollStatus; label: string }[] = [
  { value: "all", label: "Все" },
  { value: FinishedRollStatus.inStock, label: "В наличии" },
  { value: FinishedRollStatus.reserved, label: "Зарезервирован" },
  { value: FinishedRollStatus.shipped, label: "Отгружен" },
  { value: FinishedRollStatus.writtenOff, label: "Списан" },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("ru-RU");
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("ru-RU")} ${d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
}

/** OUT = красный слой, IN = синий слой (per the mockup). */
const OUT_COLOR = "text-red-500 dark:text-red-400";
const IN_COLOR = "text-blue-500 dark:text-blue-400";

/** Segmented pill group used for the direction / status filters. */
function Pills<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl bg-muted/50 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
            value === o.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Manual "Добавить рулон" dialog. */
function AddRollDialog({ vm, open, onOpenChange }: { vm: FinishedGoodsVM; open: boolean; onOpenChange: (v: boolean) => void }) {
  const materials = useMemo(
    () => Array.from(vm.materialsById.values()).sort((a, b) => a.code.localeCompare(b.code)),
    [vm.materialsById],
  );
  const [materialId, setMaterialId] = useState("");
  const [widthMm, setWidthMm] = useState("");
  const [lengthM, setLengthM] = useState("");
  const [count, setCount] = useState("1");
  const [coating, setCoating] = useState<Coating>(Coating.out);
  const [comment, setComment] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const material = materials.find((m) => m.id === materialId);
  const valid = material && Number(widthMm) > 0 && Number(lengthM) > 0 && Number(count) > 0;

  const submit = () => {
    if (!material) return;
    void vm.createManual({
      materialId: material.id,
      materialCode: material.code,
      widthMm: Number(widthMm),
      lengthM: Number(lengthM),
      count: Number(count),
      coating,
      comment: comment.trim() || undefined,
      producedAt: date ? new Date(date).toISOString() : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить рулон вручную</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label className="text-[11px]">Материал</Label>
            <Select value={materialId} onValueChange={setMaterialId}>
              <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Выберите материал" /></SelectTrigger>
              <SelectContent className="max-h-[min(60vh,var(--radix-select-content-available-height))]">
                {materials.map((m: Material) => (
                  <SelectItem key={m.id} value={m.id}>{m.code} · {m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Ширина, мм</Label>
            <Input type="number" value={widthMm} onChange={(e) => setWidthMm(e.target.value)} className="rounded-2xl" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Намотка, м</Label>
            <Input type="number" value={lengthM} onChange={(e) => setLengthM(e.target.value)} className="rounded-2xl" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Количество</Label>
            <Input type="number" value={count} onChange={(e) => setCount(e.target.value)} className="rounded-2xl" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Направление</Label>
            <Pills value={coating} onChange={setCoating} options={[{ value: Coating.in, label: "IN" }, { value: Coating.out, label: "OUT" }]} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-[11px]">Комментарий</Label>
            <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Ручное добавление" className="rounded-2xl" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Дата</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-2xl" />
          </div>
        </div>
        <DialogFooter>
          <SecondaryButton onClick={() => onOpenChange(false)}>Отмена</SecondaryButton>
          <PrimaryButton disabled={!valid} onClick={submit}>Добавить</PrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditRowDialog({ vm, row, open, onOpenChange }: { vm: FinishedGoodsVM; row: FinishedGoodsRow; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [comment, setComment] = useState(row.comment);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{row.materialCode} · {row.widthMm} мм × {row.lengthM} м</DialogTitle>
        </DialogHeader>
        <Label className="text-[11px]">Комментарий (применится ко всем {row.totalCount} рул.)</Label>
        <Input value={comment} onChange={(e) => setComment(e.target.value)} className="rounded-2xl" />
        <DialogFooter>
          <SecondaryButton onClick={() => onOpenChange(false)}>Отмена</SecondaryButton>
          <PrimaryButton onClick={() => { void vm.editComment(row.rollIds, comment.trim()); onOpenChange(false); }}>Сохранить</PrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteRowDialog({ vm, row, open, onOpenChange }: { vm: FinishedGoodsVM; row: FinishedGoodsRow; open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Удалить запись?</DialogTitle>
        </DialogHeader>
        <p className={cn(AppTypography.footnote, "text-muted-foreground")}>
          {row.materialCode} · {row.widthMm} мм × {row.lengthM} м — {row.totalCount} рул. Действие необратимо.
        </p>
        <DialogFooter>
          <SecondaryButton onClick={() => onOpenChange(false)}>Отмена</SecondaryButton>
          <Button variant="destructive" className="rounded-2xl" onClick={() => { void vm.removeRow(row.rollIds); onOpenChange(false); }}>Удалить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Finished-goods warehouse panel (aggregated table). Embeddable — the Склад
 * screen renders it in its «Склад готовых рулонов» tab. Identical rolls are
 * collapsed into one row (IN/OUT counted separately); rolls arrive automatically
 * from production and can also be added manually.
 */
export function FinishedGoodsPanel() {
  const vm = useFinishedGoodsViewModel();
  const [showFilters, setShowFilters] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<FinishedGoodsRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<FinishedGoodsRow | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  const allOnPageSelected = vm.rows.length > 0 && vm.rows.every((r) => selected.has(r.key));
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) vm.rows.forEach((r) => next.delete(r.key));
      else vm.rows.forEach((r) => next.add(r.key));
      return next;
    });

  const cell = "whitespace-nowrap px-3 py-2 text-sm";
  const headCell = cn(AppTypography.caption2, "whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground");

  return (
    <div className="space-y-3">
      {/* Material chips + action buttons */}
      <div className="flex items-start justify-between gap-3">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <MaterialChipButton label={`Все материалы (${vm.totalRollCount})`} active={vm.materialId === ""} onClick={() => vm.setMaterialId("")} />
          {vm.materialChips.map((chip) => (
            <MaterialChipButton
              key={chip.materialId}
              label={`${chip.code} (${chip.count})`}
              active={vm.materialId === chip.materialId}
              onClick={() => vm.setMaterialId(chip.materialId)}
            />
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SecondaryButton icon={SlidersHorizontal} onClick={() => setShowFilters((v) => !v)}>Фильтры</SecondaryButton>
          <PrimaryButton icon={Plus} onClick={() => setAddOpen(true)}>Добавить рулон</PrimaryButton>
        </div>
      </div>

      <SearchBar value={vm.query} onChange={vm.setQuery} placeholder="Ширина, намотка, материал, комментарий, № рулона, Джамбо" />

      {showFilters ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <span className={cn(AppTypography.caption2, "text-muted-foreground")}>Направление</span>
            <Select value={vm.direction} onValueChange={(v) => vm.setDirection(v as typeof vm.direction)}>
              <SelectTrigger className="h-8 w-[130px] rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value={Coating.in}>IN</SelectItem>
                <SelectItem value={Coating.out}>OUT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(AppTypography.caption2, "text-muted-foreground")}>Статус</span>
            <Select value={vm.status} onValueChange={(v) => vm.setStatus(v as typeof vm.status)}>
              <SelectTrigger className="h-8 w-[170px] rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {vm.hasActiveFilters ? (
            <SecondaryButton icon={RotateCcw} onClick={vm.resetFilters}>Сбросить</SecondaryButton>
          ) : null}
        </div>
      ) : null}

      {vm.loading ? (
        <LoadingView />
      ) : vm.totalRows === 0 ? (
        <EmptyState
          icon={icons.boxes}
          title={vm.hasActiveFilters ? "Ничего не найдено" : "Склад пуст"}
          message={vm.hasActiveFilters ? "Измените фильтры или строку поиска." : "Готовые рулоны появляются здесь автоматически после завершения производства, либо добавьте вручную."}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-card-border">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/40">
                  <th className={headCell}><Checkbox checked={allOnPageSelected} onCheckedChange={toggleAll} aria-label="Выбрать все" /></th>
                  <th className={headCell}>
                    <button type="button" onClick={vm.toggleWidthSort} className="inline-flex items-center gap-1 hover:text-foreground">
                      Ширина, мм
                      {vm.widthSort === "asc" ? <ArrowUp className="h-3 w-3" /> : vm.widthSort === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                    </button>
                  </th>
                  <th className={headCell}>Намотка, м</th>
                  <th className={cn(headCell, OUT_COLOR)}>OUT, шт</th>
                  <th className={cn(headCell, IN_COLOR)}>IN, шт</th>
                  <th className={headCell}>Площадь, м²</th>
                  <th className={headCell}>Статус</th>
                  <th className={headCell}>Комментарий</th>
                  <th className={headCell}>Дата поступления</th>
                  <th className={headCell}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {vm.rows.map((row) => (
                  <tr key={row.key} className="border-t border-border/60 transition-colors hover:bg-muted/40">
                    <td className={cell}><Checkbox checked={selected.has(row.key)} onCheckedChange={() => toggle(row.key)} aria-label="Выбрать строку" /></td>
                    <td className={cn(cell, "tabular-nums font-medium underline decoration-dotted underline-offset-4")}>{row.widthMm}</td>
                    <td className={cn(cell, "tabular-nums")}>{row.lengthM}</td>
                    <td className={cn(cell, "tabular-nums font-semibold", OUT_COLOR)}>{row.outCount || "—"}</td>
                    <td className={cn(cell, "tabular-nums font-semibold", IN_COLOR)}>{row.inCount || "—"}</td>
                    <td className={cn(cell, "tabular-nums")}>{row.areaM2}</td>
                    <td className={cell}><StatusBadge label={STATUS_LABEL[row.status]} tone={STATUS_TONE[row.status]} /></td>
                    <td className={cn(cell, "max-w-[220px] truncate text-muted-foreground")} title={row.comment}>{row.comment || "—"}</td>
                    <td className={cn(cell, "tabular-nums text-muted-foreground")}>{formatDateTime(row.arrivalDate)}</td>
                    <td className={cell}>
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground" aria-label="Редактировать" onClick={() => setEditRow(row)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive" aria-label="Удалить" onClick={() => setDeleteRow(row)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className={cn(AppTypography.caption, "text-muted-foreground")}>
              Показано {vm.rangeStart}–{vm.rangeEnd} из {vm.totalRows} размеров
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" disabled={vm.page <= 1} onClick={() => vm.setPage(vm.page - 1)} aria-label="Назад">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: vm.pageCount }, (_, i) => i + 1)
                  .filter((p) => Math.abs(p - vm.page) <= 2 || p === 1 || p === vm.pageCount)
                  .map((p, idx, arr) => (
                    <span key={p} className="flex items-center">
                      {idx > 0 && p - arr[idx - 1] > 1 ? <span className="px-1 text-muted-foreground">…</span> : null}
                      <Button
                        variant={p === vm.page ? "default" : "ghost"}
                        size="icon"
                        className="h-7 w-7 rounded-lg tabular-nums"
                        onClick={() => vm.setPage(p)}
                      >
                        {p}
                      </Button>
                    </span>
                  ))}
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" disabled={vm.page >= vm.pageCount} onClick={() => vm.setPage(vm.page + 1)} aria-label="Вперёд">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Select value={String(vm.pageSize)} onValueChange={(v) => vm.setPageSize(Number(v))}>
                <SelectTrigger className="h-8 w-[110px] rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} строк</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      <AddRollDialog vm={vm} open={addOpen} onOpenChange={setAddOpen} />
      {editRow ? <EditRowDialog vm={vm} row={editRow} open onOpenChange={(v) => !v && setEditRow(null)} /> : null}
      {deleteRow ? <DeleteRowDialog vm={vm} row={deleteRow} open onOpenChange={(v) => !v && setDeleteRow(null)} /> : null}
    </div>
  );
}

function MaterialChipButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/12 text-primary"
          : "border-card-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
