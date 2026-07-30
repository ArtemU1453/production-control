import { Suspense, lazy, useState } from "react";
import {
  CardView,
  InfoRow,
  LoadingView,
  MetricCard,
  ScreenScaffold,
  SecondaryButton,
  SegmentedControl,
  type SegmentOption,
} from "@/components";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { icons } from "@/resources/icons";
import { Machine, machineTitle } from "@/models";
import { ReportGrouping, groupingTitle } from "@/reports";
import { formatArea, formatMeters, formatPercent } from "@/extensions/number";
import { ComparisonKind } from "../models";
import { useAnalyticsViewModel } from "../viewmodels/useAnalyticsViewModel";
import type { StatusSlice, TrendMetric } from "./AnalyticsCharts";

const AnalyticsCharts = lazy(() => import("./AnalyticsCharts"));

const ALL = "all";

const groupingOptions: ReadonlyArray<SegmentOption<ReportGrouping>> = [
  ReportGrouping.day,
  ReportGrouping.week,
  ReportGrouping.month,
  ReportGrouping.quarter,
  ReportGrouping.year,
].map((value) => ({ value, label: groupingTitle(value) }));

const comparisonOptions: ReadonlyArray<SegmentOption<ComparisonKind>> = [
  { value: ComparisonKind.dayOverDay, label: "День" },
  { value: ComparisonKind.monthOverMonth, label: "Месяц" },
  { value: ComparisonKind.yearOverYear, label: "Год" },
];

const metricOptions: ReadonlyArray<SegmentOption<TrendMetric>> = [
  { value: "orders", label: "Заказы" },
  { value: "rolls", label: "Рулоны" },
  { value: "materialUsedM", label: "Расход" },
  { value: "usefulAreaM2", label: "Полезная" },
];

const chartOptions: ReadonlyArray<SegmentOption<"line" | "bar">> = [
  { value: "line", label: "Линия" },
  { value: "bar", label: "Столбцы" },
];

function DeltaHint({ percent }: { percent?: number }) {
  if (percent === undefined) {
    return null;
  }
  const up = percent >= 0;
  return (
    <span className={cn(up ? "text-[hsl(142_71%_40%)]" : "text-destructive")}>
      {up ? "▲" : "▼"} {Math.abs(percent).toFixed(1)}% к пред.
    </span>
  );
}

function Table({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-border">
            {columns.map((c, i) => (
              <th key={c} className={cn("whitespace-nowrap px-2 py-1.5 font-semibold text-muted-foreground", i === 0 ? "text-left" : "text-right")}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-border/50">
              {row.map((cell, ci) => (
                <td key={ci} className={cn("whitespace-nowrap px-2 py-1.5", ci === 0 ? "text-left" : "text-right tabular-nums")}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AnalyticsCenterView() {
  const vm = useAnalyticsViewModel();
  const { filter } = vm;
  const [chartType, setChartType] = useState<"line" | "bar">("bar");
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("orders");

  const deltaFor = (key: string) =>
    vm.comparison?.metrics.find((m) => m.key === key)?.deltaPercent;

  const overview = vm.overview;
  const statuses: StatusSlice[] = overview
    ? [
        { label: "На складе", value: overview.jumbos.onStock, color: "#64748b" },
        { label: "В работе", value: overview.jumbos.inWork, color: "#eab308" },
        { label: "К списанию", value: overview.jumbos.toWriteOff, color: "#ef4444" },
        { label: "Архив", value: overview.jumbos.archived, color: "#94a3b8" },
      ]
    : [];

  return (
    <ScreenScaffold title="Аналитика" subtitle="Производственные KPI">
      <div className="space-y-4">
        <CardView title="Фильтры" icon={icons.analytics} animate>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="a-start" className="text-xs">Дата начала</Label>
                <Input id="a-start" type="date" className="rounded-2xl" value={filter.startDate ?? ""} onChange={(e) => vm.updateFilter("startDate", e.target.value || undefined)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="a-end" className="text-xs">Дата окончания</Label>
                <Input id="a-end" type="date" className="rounded-2xl" value={filter.endDate ?? ""} onChange={(e) => vm.updateFilter("endDate", e.target.value || undefined)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Материал</Label>
                <Select value={filter.materialCode ?? ALL} onValueChange={(v) => vm.updateFilter("materialCode", v === ALL ? undefined : v)}>
                  <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Все материалы</SelectItem>
                    {vm.materialOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Станок</Label>
                <Select value={filter.machine ?? ALL} onValueChange={(v) => vm.updateFilter("machine", v === ALL ? undefined : (v as Machine))}>
                  <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Все станки</SelectItem>
                    {vm.machineOptions.map((m) => <SelectItem key={m} value={m}>{machineTitle(m)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Оператор</Label>
              <Select value={filter.operator ?? ALL} onValueChange={(v) => vm.updateFilter("operator", v === ALL ? undefined : v)}>
                <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Все операторы</SelectItem>
                  {vm.operatorOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <SecondaryButton fullWidth onClick={vm.resetFilter}>Сбросить фильтры</SecondaryButton>
          </div>
        </CardView>

        {vm.loading || !overview ? (
          <LoadingView />
        ) : (
          <>
            <CardView title="KPI производства" icon={icons.gauge} headerTone="accent" animate>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="Заказы" value={overview.production.orders} hint={<DeltaHint percent={deltaFor("orders")} />} />
                <MetricCard label="Рулоны" value={overview.production.rolls} hint={<DeltaHint percent={deltaFor("rolls")} />} />
                <MetricCard label="Расход материала" value={formatMeters(overview.production.materialUsedM)} hint={<DeltaHint percent={deltaFor("material")} />} />
                <MetricCard label="Полезная площадь" value={formatArea(overview.production.usefulAreaM2)} hint={<DeltaHint percent={deltaFor("useful")} />} />
                <MetricCard label="Брак" value={formatArea(overview.production.wasteAreaM2)} />
                <MetricCard label="Тех. остаток" value={formatArea(overview.production.scrapAreaM2)} />
                <MetricCard label="Общие потери" value={formatArea(overview.production.totalLossesM2)} />
                <MetricCard label="Использование" value={formatPercent(overview.production.avgUsagePercent)} hint={<DeltaHint percent={deltaFor("usage")} />} />
                <MetricCard label="Расход на заказ" value={formatMeters(overview.production.avgPerOrderM)} />
                <MetricCard label="Расход на рулон" value={formatMeters(overview.production.avgPerRollM)} />
              </div>
            </CardView>

            <CardView title="Джамбы" icon={icons.jumbo} animate>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="Всего" value={overview.jumbos.total} />
                <MetricCard label="На складе" value={overview.jumbos.onStock} />
                <MetricCard label="В работе" value={overview.jumbos.inWork} />
                <MetricCard label="К списанию" value={overview.jumbos.toWriteOff} />
                <MetricCard label="В архиве" value={overview.jumbos.archived} />
                <MetricCard label="Средняя площадь" value={formatArea(overview.jumbos.avgAreaM2)} />
                <MetricCard label="Средний остаток" value={formatMeters(overview.jumbos.avgRemainderM)} />
                <MetricCard label="Ср. использование" value={formatPercent(overview.jumbos.avgUsagePercent)} />
              </div>
            </CardView>

            <CardView title="Динамика" icon={icons.dashboard} animate>
              <div className="space-y-3">
                <SegmentedControl options={metricOptions} value={trendMetric} onChange={setTrendMetric} aria-label="Показатель" />
                <div className="flex items-center gap-2">
                  <SegmentedControl options={chartOptions} value={chartType} onChange={setChartType} aria-label="Тип графика" className="flex-1" />
                  <SegmentedControl options={groupingOptions} value={filter.grouping} onChange={(v) => vm.updateFilter("grouping", v)} aria-label="Период" className="flex-1" />
                </div>
                <Suspense fallback={<LoadingView />}>
                  <AnalyticsCharts trend={overview.trend} statuses={statuses} metric={trendMetric} chartType={chartType} />
                </Suspense>
              </div>
            </CardView>

            <CardView
              title="Сравнение периодов"
              icon={icons.clock}
              animate
              headerTrailing={
                vm.comparison ? (
                  <span className="text-xs text-muted-foreground">
                    {vm.comparison.currentLabel} / {vm.comparison.previousLabel}
                  </span>
                ) : undefined
              }
            >
              <div className="space-y-3">
                <SegmentedControl options={comparisonOptions} value={vm.comparisonKind} onChange={vm.setComparisonKind} aria-label="Сравнение" />
                <div className="space-y-2">
                  {(vm.comparison?.metrics ?? []).map((m, i, arr) => (
                    <InfoRow
                      key={m.key}
                      label={m.label}
                      value={
                        <span className="flex items-center gap-2">
                          <span>{m.current}{m.unit ? ` ${m.unit}` : ""}</span>
                          <DeltaHint percent={m.deltaPercent} />
                        </span>
                      }
                      last={i === arr.length - 1}
                    />
                  ))}
                </div>
              </div>
            </CardView>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {overview.rankings.map((ranking) => (
                <CardView key={ranking.key} title={ranking.title} icon={icons.analytics} animate>
                  {ranking.entries.length === 0 ? (
                    <div className="py-1 text-sm text-muted-foreground">Нет данных</div>
                  ) : (
                    <div className="space-y-2">
                      {ranking.entries.map((entry, i) => (
                        <InfoRow key={entry.label} label={`${i + 1}. ${entry.label}`} value={entry.display} last={i === ranking.entries.length - 1} />
                      ))}
                    </div>
                  )}
                </CardView>
              ))}
            </div>

            <CardView title="Операторы" icon={icons.settings} animate>
              <Table
                columns={["Оператор", "Заказы", "Рулоны", "Расход", "Полезная", "% брака"]}
                rows={overview.operators.map((o) => [o.operator, o.orders, o.rolls, formatMeters(o.materialUsedM), formatArea(o.usefulAreaM2), formatPercent(o.wastePercent)])}
              />
            </CardView>

            <CardView title="Станки" icon={icons.cut} animate>
              <Table
                columns={["Станок", "Заказы", "Рулоны", "Расход", "Полезная", "Произв."]}
                rows={overview.machines.map((m) => [m.machineTitle, m.orders, m.rolls, formatMeters(m.materialUsedM), formatArea(m.usefulAreaM2), `${m.productivity} рул/ч`])}
              />
            </CardView>

            <CardView title="Материалы" icon={icons.material} animate>
              <Table
                columns={["Материал", "Джамбы", "Использовано", "Остаток", "Полезная", "Заказы"]}
                rows={overview.materials.map((m) => [m.materialCode, m.jumbos, formatMeters(m.usedM), formatMeters(m.remainderM), formatArea(m.usefulAreaM2), m.orders])}
              />
            </CardView>
          </>
        )}
      </div>
    </ScreenScaffold>
  );
}
