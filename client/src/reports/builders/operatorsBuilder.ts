import { ReportSort } from "../models/ReportFilter";
import { ReportKind } from "../models/ReportKind";
import type { ReportContext } from "../repositories/ReportContext";
import {
  applySort,
  buildReportData,
  fmtA,
  fmtM,
  fmtP,
  makeRow,
  round1,
  summaryItem,
  type ReportBuilder,
} from "./support";

interface OperatorAggregate {
  orders: number;
  rolls: number;
  material: number;
  useful: number;
}

/** One row per operator, aggregating their sessions. */
export const operatorsBuilder: ReportBuilder = {
  kind: ReportKind.operators,
  build(context: ReportContext) {
    const groups = new Map<string, OperatorAggregate>();
    for (const session of context.sessions) {
      const operator = session.order.operator || "—";
      const agg = groups.get(operator) ?? { orders: 0, rolls: 0, material: 0, useful: 0 };
      agg.orders += 1;
      agg.rolls += session.result.total_rolls;
      agg.material += session.result.used_length_m;
      agg.useful += session.result.useful_area_m2;
      groups.set(operator, agg);
    }

    // Average waste percentage per operator from frozen archive statistics.
    const wasteByOperator = new Map<string, { sum: number; count: number }>();
    for (const entry of context.archived) {
      const operator = entry.archivedBy ?? "—";
      const acc = wasteByOperator.get(operator) ?? { sum: 0, count: 0 };
      acc.sum += entry.statistics.wastePercent;
      acc.count += 1;
      wasteByOperator.set(operator, acc);
    }
    const wastePercent = (operator: string) => {
      const acc = wasteByOperator.get(operator);
      return acc && acc.count > 0 ? acc.sum / acc.count : 0;
    };

    const rows = applySort(
      Array.from(groups.entries()).map(([operator, agg]) =>
        makeRow(operator, {
          operator,
          orders: agg.orders,
          rolls: agg.rolls,
          material: fmtM(agg.material),
          useful: fmtA(agg.useful),
          waste: fmtP(wastePercent(operator)),
          _orders: agg.orders,
          _usage: round1(agg.material),
        }),
      ),
      context.filter.sort,
      {
        [ReportSort.operator]: (row) => row.cells.operator,
        [ReportSort.orders]: (row) => Number(row.cells._orders),
        [ReportSort.usage]: (row) => Number(row.cells._usage),
      },
    );

    return buildReportData({
      kind: ReportKind.operators,
      title: "Отчёт по операторам",
      filter: context.filter,
      columns: [
        { key: "operator", title: "Оператор" },
        { key: "orders", title: "Заказы", numeric: true },
        { key: "rolls", title: "Рулоны", numeric: true },
        { key: "material", title: "Материал", numeric: true },
        { key: "useful", title: "Полезная площадь", numeric: true },
        { key: "waste", title: "% брака", numeric: true },
      ],
      rows,
      summary: [
        summaryItem("operators", "Операторов", String(groups.size)),
        summaryItem("orders", "Заказов всего", String(context.sessions.length)),
      ],
    });
  },
};
