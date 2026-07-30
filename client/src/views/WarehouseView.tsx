import { Link } from "wouter";
import { Archive, Plus } from "lucide-react";
import {
  EmptyState,
  LoadingView,
  ScreenScaffold,
  SearchBar,
  SegmentedControl,
  StatusBadge,
  type SegmentOption,
} from "@/components";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import {
  JumboStatus,
  jumboStatusColorRole,
  jumboStatusTitle,
  type StatusColorRole,
} from "@/models";
import { formatMeters } from "@/extensions/number";
import {
  useWarehouseViewModel,
  type WarehouseFilter,
  type WarehouseSortKey,
} from "@/viewmodels";

const sortOptions: ReadonlyArray<SegmentOption<WarehouseSortKey>> = [
  { value: "arrivalDate", label: "По дате" },
  { value: "material", label: "По материалу" },
  { value: "remainder", label: "По остатку" },
  { value: "stockNumber", label: "По номеру" },
];

/** Left accent bar colour per status — the warehouse colour indication. */
const accentByRole: Record<StatusColorRole, string> = {
  neutral: "border-l-border",
  warning: "border-l-[hsl(38_92%_50%)]",
  danger: "border-l-destructive",
  muted: "border-l-muted-foreground/40",
};

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
          <div className="space-y-3">
            {vm.jumbos.map((jumbo) => {
              const role = jumboStatusColorRole(jumbo.status);
              const material = vm.materialsById.get(jumbo.materialId);
              return (
                <Link key={jumbo.id} href={`/warehouse/${jumbo.id}`} className="block">
                  <div
                    className={cn(
                      "glass noise flex items-center gap-3 rounded-3xl border-l-4 border-card-border p-4 transition-transform active:scale-[0.99]",
                      accentByRole[role],
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">
                        № {jumbo.stockNumber} · {jumbo.materialCode}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {material?.name ?? "—"} · {jumbo.widthMm} мм · Остаток:{" "}
                        {formatMeters(jumbo.currentRemainderM)}
                      </div>
                    </div>
                    <StatusBadge label={jumboStatusTitle(jumbo.status)} tone={role} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </ScreenScaffold>
  );
}
