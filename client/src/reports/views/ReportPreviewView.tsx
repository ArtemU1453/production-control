import { Link } from "wouter";
import { FileText } from "lucide-react";
import {
  CardView,
  InfoRow,
  LoadingView,
  ScreenScaffold,
  SecondaryButton,
  SegmentedControl,
  type SegmentOption,
} from "@/components";
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
import { cn } from "@/lib/utils";
import { icons } from "@/resources/icons";
import { JumboStatus, Machine, jumboStatusTitle, machineTitle } from "@/models";
import {
  ReportGrouping,
  ReportSort,
  groupingTitle,
  sortTitle,
  type ReportKind,
} from "../models";
import { useReportPreviewViewModel } from "../viewmodels/useReportPreviewViewModel";

const groupingOptions: ReadonlyArray<SegmentOption<ReportGrouping>> = Object.values(
  ReportGrouping,
).map((value) => ({ value, label: groupingTitle(value) }));

const sortOptions: ReadonlyArray<SegmentOption<ReportSort>> = Object.values(ReportSort).map(
  (value) => ({ value, label: sortTitle(value) }),
);

const ALL = "all";

export function ReportPreviewView({ kind }: { kind: ReportKind }) {
  const vm = useReportPreviewViewModel(kind);
  const { filter } = vm;
  const report = vm.report;

  return (
    <ScreenScaffold
      title={vm.title}
      toolbar={
        <Link href="/documents/new">
          <Button variant="secondary" size="icon" className="rounded-xl" aria-label="Сформировать PDF">
            <FileText className="h-4 w-4" />
          </Button>
        </Link>
      }
    >
      <div className="space-y-4">
        <CardView title="Фильтры" icon={icons.analytics} animate>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="rf-start" className="text-xs">Дата начала</Label>
                <Input
                  id="rf-start"
                  type="date"
                  className="rounded-2xl"
                  value={filter.startDate ?? ""}
                  onChange={(e) => vm.updateFilter("startDate", e.target.value || undefined)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rf-end" className="text-xs">Дата окончания</Label>
                <Input
                  id="rf-end"
                  type="date"
                  className="rounded-2xl"
                  value={filter.endDate ?? ""}
                  onChange={(e) => vm.updateFilter("endDate", e.target.value || undefined)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Материал</Label>
                <Select
                  value={filter.materialCode ?? ALL}
                  onValueChange={(v) => vm.updateFilter("materialCode", v === ALL ? undefined : v)}
                >
                  <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Все материалы</SelectItem>
                    {vm.materialOptions.map((code) => (
                      <SelectItem key={code} value={code}>{code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Станок</Label>
                <Select
                  value={filter.machine ?? ALL}
                  onValueChange={(v) => vm.updateFilter("machine", v === ALL ? undefined : (v as Machine))}
                >
                  <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Все станки</SelectItem>
                    {vm.machineOptions.map((machine) => (
                      <SelectItem key={machine} value={machine}>{machineTitle(machine)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Оператор</Label>
                <Select
                  value={filter.operator ?? ALL}
                  onValueChange={(v) => vm.updateFilter("operator", v === ALL ? undefined : v)}
                >
                  <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Все операторы</SelectItem>
                    {vm.operatorOptions.map((operator) => (
                      <SelectItem key={operator} value={operator}>{operator}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Статус</Label>
                <Select
                  value={filter.status ?? ALL}
                  onValueChange={(v) => vm.updateFilter("status", v === ALL ? undefined : (v as JumboStatus))}
                >
                  <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Все статусы</SelectItem>
                    {vm.statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>{jumboStatusTitle(status)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Заказчик</Label>
              <Input
                className="rounded-2xl"
                value={filter.customer ?? ""}
                onChange={(e) => vm.updateFilter("customer", e.target.value || undefined)}
                placeholder="Все заказчики"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Группировка</Label>
              <SegmentedControl
                options={groupingOptions}
                value={filter.grouping}
                onChange={(v) => vm.updateFilter("grouping", v)}
                aria-label="Группировка"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Сортировка</Label>
              <SegmentedControl
                options={sortOptions}
                value={filter.sort}
                onChange={(v) => vm.updateFilter("sort", v)}
                aria-label="Сортировка"
              />
            </div>

            <SecondaryButton fullWidth onClick={vm.resetFilter}>Сбросить фильтры</SecondaryButton>
          </div>
        </CardView>

        {vm.loading || !report ? (
          <LoadingView />
        ) : (
          <>
            <CardView title={report.title} icon={icons.reports} headerTone="accent" animate>
              <div className="space-y-3">
                <InfoRow label="Период" value={report.period.label} />
                <InfoRow label="Сформирован" value={report.generatedAt.slice(0, 16).replace("T", " ")} last />
              </div>
            </CardView>

            <CardView title="Данные" icon={icons.dashboard} animate>
              {report.table.rows.length === 0 ? (
                <div className="py-2 text-sm text-muted-foreground">Нет данных за выбранный период</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        {report.table.columns.map((column) => (
                          <th
                            key={column.key}
                            className={cn(
                              "whitespace-nowrap px-2 py-1.5 font-semibold text-muted-foreground",
                              column.numeric ? "text-right" : "text-left",
                            )}
                          >
                            {column.title}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.table.rows.map((row) => (
                        <tr key={row.id} className="border-b border-border/50">
                          {report.table.columns.map((column) => (
                            <td
                              key={column.key}
                              className={cn(
                                "whitespace-nowrap px-2 py-1.5",
                                column.numeric ? "text-right tabular-nums" : "text-left",
                              )}
                            >
                              {row.cells[column.key] ?? ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardView>

            <CardView title="Итоговые показатели" icon={icons.gauge} animate>
              <div className="space-y-2">
                {report.summary.map((item, index) => (
                  <InfoRow
                    key={item.key}
                    label={item.label}
                    value={item.value}
                    last={index === report.summary.length - 1}
                  />
                ))}
              </div>
            </CardView>
          </>
        )}
      </div>
    </ScreenScaffold>
  );
}
