import { useState } from "react";
import { Link } from "wouter";
import { Archive, Calendar, Pencil, Plus, Trash2 } from "lucide-react";
import {
  EmptyState,
  LoadingView,
  PrimaryButton,
  ScreenScaffold,
  SearchBar,
  SecondaryButton,
  SegmentedControl,
  type SegmentOption,
} from "@/components";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import { AppTypography } from "@/designsystem";
import {
  JumboStatus,
  jumboStatusColorRole,
  jumboStatusTitle,
  type Jumbo,
  type Material,
  type StatusColorRole,
} from "@/models";
import { formatMeters } from "@/extensions/number";
import {
  useWarehouseViewModel,
  type WarehouseFilter,
  type WarehouseSortKey,
} from "@/viewmodels";

type WarehouseVM = ReturnType<typeof useWarehouseViewModel>;

const sortOptions: ReadonlyArray<SegmentOption<WarehouseSortKey>> = [
  { value: "arrivalDate", label: "По дате" },
  { value: "material", label: "По материалу" },
  { value: "remainder", label: "По остатку" },
  { value: "stockNumber", label: "По номеру" },
];

/** Status dot colour — the app's existing status palette (green = on stock). */
const dotByRole: Record<StatusColorRole, string> = {
  neutral: "bg-[hsl(142_71%_45%)]",
  warning: "bg-[hsl(38_92%_50%)]",
  danger: "bg-destructive",
  muted: "bg-muted-foreground",
};
const textByRole: Record<StatusColorRole, string> = {
  neutral: "text-[hsl(142_71%_38%)] dark:text-[hsl(142_71%_60%)]",
  warning: "text-[hsl(38_92%_40%)] dark:text-[hsl(38_92%_62%)]",
  danger: "text-destructive",
  muted: "text-muted-foreground",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("ru-RU");
}

function StatusDot({ role, label }: { role: StatusColorRole; label: string }) {
  return (
    <span className={cn(AppTypography.caption, "inline-flex shrink-0 items-center gap-1.5 font-medium", textByRole[role])}>
      <span className={cn("h-2 w-2 rounded-full", dotByRole[role])} />
      {label}
    </span>
  );
}

/** Delete confirmation for a Jumbo card's trash action. */
function DeleteJumboDialog({ jumbo, material, onConfirm }: { jumbo: Jumbo; material?: Material; onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive" aria-label="Удалить">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Удалить Джамбо?</DialogTitle>
        </DialogHeader>
        <p className={cn(AppTypography.footnote, "text-muted-foreground")}>
          {jumbo.materialCode}
          {material?.name ? ` · ${material.name}` : ""} — {formatMeters(jumbo.currentRemainderM)}. Действие необратимо.
        </p>
        <div className="flex justify-end gap-2">
          <SecondaryButton onClick={() => setOpen(false)}>Отмена</SecondaryButton>
          <Button
            variant="destructive"
            className="rounded-2xl"
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            Удалить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Compact Jumbo card — material code + name, status dot, three metrics and a
 *  footer with the arrival date and edit / delete icons. No stock/internal
 *  numbers, supplier, batch, comment (per the warehouse card spec). */
function JumboCard({ vm, jumbo, material }: { vm: WarehouseVM; jumbo: Jumbo; material?: Material }) {
  const role = jumboStatusColorRole(jumbo.status);
  const metric = (label: string, value: string) => (
    <div className="min-w-0">
      <div className={cn(AppTypography.caption2, "text-muted-foreground")}>{label}</div>
      <div className={cn(AppTypography.footnote, "truncate tabular-nums font-medium")}>{value}</div>
    </div>
  );
  return (
    <div className="glass noise rounded-2xl border border-card-border p-3 transition-colors hover:border-primary/40">
      <Link href={`/warehouse/${jumbo.id}`} className="block">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold leading-tight">{jumbo.materialCode}</div>
            <div className={cn(AppTypography.caption, "truncate text-muted-foreground")}>{material?.name ?? "—"}</div>
          </div>
          <StatusDot role={role} label={jumboStatusTitle(jumbo.status)} />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {metric("Ширина", `${jumbo.widthMm} мм`)}
          {metric("Намотка", formatMeters(jumbo.initialWindingM))}
          {metric("Остаток", formatMeters(jumbo.currentRemainderM))}
        </div>
      </Link>
      <div className="mt-2 flex items-center justify-between border-t border-card-border pt-2">
        <span className={cn(AppTypography.caption, "inline-flex items-center gap-1 text-muted-foreground")}>
          <Calendar className="h-3.5 w-3.5" />
          {formatDate(jumbo.arrivalDate)}
        </span>
        <div className="flex items-center gap-0.5">
          <Link href={`/warehouse/${jumbo.id}`}>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground" aria-label="Редактировать">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <DeleteJumboDialog jumbo={jumbo} material={material} onConfirm={() => void vm.deleteJumbo(jumbo.id)} />
        </div>
      </div>
    </div>
  );
}

export function WarehouseView() {
  const vm = useWarehouseViewModel();

  const filterOptions: ReadonlyArray<SegmentOption<WarehouseFilter>> = [
    { value: "all", label: "Все", badge: vm.counts.all },
    { value: JumboStatus.onStock, label: jumboStatusTitle(JumboStatus.onStock), badge: vm.counts[JumboStatus.onStock] },
    { value: JumboStatus.inWork, label: jumboStatusTitle(JumboStatus.inWork), badge: vm.counts[JumboStatus.inWork] },
    { value: JumboStatus.toWriteOff, label: jumboStatusTitle(JumboStatus.toWriteOff), badge: vm.counts[JumboStatus.toWriteOff] },
    { value: JumboStatus.archived, label: jumboStatusTitle(JumboStatus.archived), badge: vm.counts[JumboStatus.archived] },
  ];

  return (
    <ScreenScaffold
      title={strings.warehouse.title}
      wide
      toolbar={
        <>
          <Link href="/archive">
            <Button variant="secondary" size="icon" className="rounded-xl" aria-label="Архив">
              <Archive className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/warehouse/receipt">
            <Button variant="default" size="icon" className="rounded-xl" aria-label="Поступление сырья">
              <Plus className="h-4 w-4" />
            </Button>
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        <SearchBar
          value={vm.query}
          onChange={vm.setQuery}
          placeholder="Номер, код, материал, статус"
        />
        <SegmentedControl
          options={filterOptions}
          value={vm.filter}
          onChange={vm.setFilter}
          aria-label="Фильтр по статусу"
        />
        <SegmentedControl
          options={sortOptions}
          value={vm.sortKey}
          onChange={vm.setSortKey}
          aria-label="Сортировка"
        />

        {vm.loading ? (
          <LoadingView />
        ) : vm.jumbos.length === 0 ? (
          <EmptyState
            icon={icons.warehouse}
            title={strings.warehouse.empty}
            message={strings.warehouse.emptyHint}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {vm.jumbos.map((jumbo) => (
              <JumboCard key={jumbo.id} vm={vm} jumbo={jumbo} material={vm.materialsById.get(jumbo.materialId)} />
            ))}
          </div>
        )}
      </div>
    </ScreenScaffold>
  );
}
