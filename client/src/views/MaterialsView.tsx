import { Link } from "wouter";
import { Plus } from "lucide-react";
import {
  EmptyState,
  ListRow,
  LoadingView,
  ScreenScaffold,
  SearchBar,
  SegmentedControl,
  StatusBadge,
  type SegmentOption,
} from "@/components";
import { Button } from "@/components/ui/button";
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import { MaterialStatus, materialStatusTitle } from "@/models";
import {
  useMaterialsViewModel,
  type MaterialSortKey,
  type MaterialStatusFilter,
} from "@/viewmodels";

const statusOptions: ReadonlyArray<SegmentOption<MaterialStatusFilter>> = [
  { value: "all", label: "Все" },
  { value: MaterialStatus.active, label: materialStatusTitle(MaterialStatus.active) },
  { value: MaterialStatus.inactive, label: materialStatusTitle(MaterialStatus.inactive) },
];

const sortOptions: ReadonlyArray<SegmentOption<MaterialSortKey>> = [
  { value: "code", label: "По коду" },
  { value: "name", label: "По названию" },
  { value: "createdAt", label: "По дате" },
];

/** Reference book of materials: search, status filter, sort and navigation to
 *  the create/edit form. */
export function MaterialsView() {
  const vm = useMaterialsViewModel();

  return (
    <ScreenScaffold
      title={strings.materials.title}
      toolbar={
        <Link href="/materials/new">
          <Button variant="default" size="icon" className="rounded-xl" aria-label="Добавить материал">
            <Plus className="h-4 w-4" />
          </Button>
        </Link>
      }
    >
      <div className="space-y-4">
        <SearchBar value={vm.query} onChange={vm.setQuery} placeholder="Код, название, производитель" />
        <SegmentedControl
          options={statusOptions}
          value={vm.statusFilter}
          onChange={vm.setStatusFilter}
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
        ) : vm.materials.length === 0 ? (
          <EmptyState
            icon={icons.material}
            title={strings.materials.empty}
            message={strings.materials.emptyHint}
          />
        ) : (
          <div className="space-y-3">
            {vm.materials.map((material) => (
              <ListRow
                key={material.id}
                href={`/materials/${material.id}/edit`}
                icon={icons.material}
                title={`${material.code} · ${material.name}`}
                subtitle={`${material.manufacturer || "—"} · ${material.thicknessMicron} мкм · ${material.standardWidthMm} мм`}
                trailing={
                  <StatusBadge
                    label={materialStatusTitle(material.status)}
                    tone={material.status === MaterialStatus.active ? "neutral" : "muted"}
                  />
                }
              />
            ))}
          </div>
        )}
      </div>
    </ScreenScaffold>
  );
}
