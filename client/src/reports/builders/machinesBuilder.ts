import { machineTitle, type Machine } from "@/models";
import { ReportSort } from "../models/ReportFilter";
import { ReportKind } from "../models/ReportKind";
import type { ReportContext } from "../repositories/ReportContext";
import {
  applySort,
  buildReportData,
  fmtA,
  fmtM,
  makeRow,
  round1,
  summaryItem,
  type ReportBuilder,
} from "./support";

interface MachineAggregate {
  orders: number;
  rolls: number;
  material: number;
  useful: number;
  hours: number;
}

/** One row per machine, aggregating its sessions. */
export const machinesBuilder: ReportBuilder = {
  kind: ReportKind.machines,
  build(context: ReportContext) {
    const groups = new Map<Machine, MachineAggregate>();
    for (const session of context.sessions) {
      const machine = session.order.machine;
      const agg = groups.get(machine) ?? { orders: 0, rolls: 0, material: 0, useful: 0, hours: 0 };
      agg.orders += 1;
      agg.rolls += session.result.total_rolls;
      agg.material += session.result.used_length_m;
      agg.useful += session.result.useful_area_m2;
      agg.hours += session.result.estimated_hours ?? 0;
      groups.set(machine, agg);
    }

    const rows = applySort(
      Array.from(groups.entries()).map(([machine, agg]) =>
        makeRow(machine, {
          machine: machineTitle(machine),
          orders: agg.orders,
          rolls: agg.rolls,
          material: fmtM(agg.material),
          useful: fmtA(agg.useful),
          hours: `${round1(agg.hours)} ч`,
          _orders: agg.orders,
          _usage: round1(agg.material),
        }),
      ),
      context.filter.sort,
      {
        [ReportSort.machine]: (row) => row.cells.machine,
        [ReportSort.orders]: (row) => Number(row.cells._orders),
        [ReportSort.usage]: (row) => Number(row.cells._usage),
      },
    );

    return buildReportData({
      kind: ReportKind.machines,
      title: "Отчёт по станкам",
      filter: context.filter,
      columns: [
        { key: "machine", title: "Станок" },
        { key: "orders", title: "Заказы", numeric: true },
        { key: "rolls", title: "Рулоны", numeric: true },
        { key: "material", title: "Материал", numeric: true },
        { key: "useful", title: "Полезная площадь", numeric: true },
        { key: "hours", title: "Время работы", numeric: true },
      ],
      rows,
      summary: [
        summaryItem("machines", "Станков", String(groups.size)),
        summaryItem("orders", "Заказов всего", String(context.sessions.length)),
      ],
    });
  },
};
