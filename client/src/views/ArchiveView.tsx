import { Archive } from "lucide-react";
import {
  CardView,
  EmptyState,
  ListRow,
  LoadingView,
  ScreenScaffold,
  SearchBar,
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
import { strings } from "@/resources/strings";
import { formatDate } from "@/extensions/date";
import { formatPercent } from "@/extensions/number";
import {
  ARCHIVE_MONTHS,
  useArchiveViewModel,
  type ArchiveMaterialFilter,
  type ArchiveYearFilter,
} from "@/viewmodels";

const MONTH_NAMES: Record<string, string> = {
  "01": "Январь", "02": "Февраль", "03": "Март", "04": "Апрель",
  "05": "Май", "06": "Июнь", "07": "Июль", "08": "Август",
  "09": "Сентябрь", "10": "Октябрь", "11": "Ноябрь", "12": "Декабрь",
};

/** Archive of closed Jumbos with frozen statistics, search and filters. */
export function ArchiveView() {
  const vm = useArchiveViewModel();

  const materialOptions: ReadonlyArray<SegmentOption<ArchiveMaterialFilter>> = [
    { value: "all", label: "Все материалы" },
    ...vm.materialOptions.map((code) => ({ value: code, label: code })),
  ];
  const yearOptions: ReadonlyArray<SegmentOption<ArchiveYearFilter>> = [
    { value: "all", label: "Все годы" },
    ...vm.yearOptions.map((year) => ({ value: year, label: year })),
  ];

  return (
    <ScreenScaffold title={strings.archive.title}>
      <div className="space-y-4">
        <SearchBar
          value={vm.query}
          onChange={vm.setQuery}
          placeholder="Номер, материал, оператор, период"
        />
        <SegmentedControl
          options={materialOptions}
          value={vm.materialFilter}
          onChange={vm.setMaterialFilter}
          aria-label="Фильтр по материалу"
        />
        <div className="flex items-center gap-2">
          <SegmentedControl
            options={yearOptions}
            value={vm.yearFilter}
            onChange={vm.setYearFilter}
            aria-label="Фильтр по году"
            className="flex-1"
          />
          <Select value={vm.monthFilter} onValueChange={vm.setMonthFilter}>
            <SelectTrigger className="w-32 shrink-0 rounded-2xl">
              <SelectValue placeholder="Месяц" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все месяцы</SelectItem>
              {ARCHIVE_MONTHS.map((month) => (
                <SelectItem key={month} value={month}>
                  {MONTH_NAMES[month]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {vm.loading ? (
          <LoadingView />
        ) : vm.archived.length === 0 ? (
          <CardView animate>
            <EmptyState icon={Archive} title={strings.archive.empty} message={strings.archive.emptyHint} />
          </CardView>
        ) : (
          <div className="space-y-3">
            {vm.archived.map((entry) => (
              <ListRow
                key={entry.id}
                href={`/archive/${entry.id}`}
                icon={Archive}
                title={`№ ${entry.jumbo.stockNumber} · ${entry.jumbo.materialCode}`}
                subtitle={`Закрыт: ${formatDate(entry.archivedAt)} · Заказов: ${entry.statistics.ordersCount}`}
                trailing={
                  <StatusBadge
                    label={`Исп.: ${formatPercent(entry.statistics.usefulPercent)}`}
                    tone={entry.statistics.usefulPercent >= 80 ? "neutral" : "warning"}
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
