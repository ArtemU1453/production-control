import { coatingTitle, machineTitle, type CuttingSession } from "@/models";
import { ReportGrouping, ReportSort } from "../models/ReportFilter";
import { ReportKind } from "../models/ReportKind";
import type { ReportContext } from "../repositories/ReportContext";
import type { ReportColumn, ReportRow } from "../models/ReportData";
import {
  bucketLabel,
  buildReportData,
  fmtA,
  fmtM,
  makeRow,
  summaryItem,
  type ReportBuilder,
} from "./support";

function sortSessions(sessions: CuttingSession[], sort: ReportSort): CuttingSession[] {
  const copy = [...sessions];
  switch (sort) {
    case ReportSort.material:
      return copy.sort((a, b) => a.materialCode.localeCompare(b.materialCode));
    case ReportSort.operator:
      return copy.sort((a, b) => a.order.operator.localeCompare(b.order.operator));
    case ReportSort.machine:
      return copy.sort((a, b) => a.order.machine.localeCompare(b.order.machine));
    case ReportSort.usage:
      return copy.sort((a, b) => b.result.used_length_m - a.result.used_length_m);
    case ReportSort.date:
    case ReportSort.orders:
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

/** One row per production session, or per-period buckets when grouped. */
export const ordersBuilder: ReportBuilder = {
  kind: ReportKind.orders,
  build(context: ReportContext) {
    const { sessions, filter } = context;

    const summary = [
      summaryItem("orders", "Количество заказов", String(sessions.length)),
      summaryItem("rolls", "Количество рулонов", String(sessions.reduce((s, x) => s + x.result.total_rolls, 0))),
      summaryItem("material", "Общий расход", fmtM(sessions.reduce((s, x) => s + x.result.used_length_m, 0))),
      summaryItem("useful", "Полезная площадь", fmtA(sessions.reduce((s, x) => s + x.result.useful_area_m2, 0))),
    ];

    let columns: ReportColumn[];
    let rows: ReportRow[];

    if (filter.grouping !== ReportGrouping.none) {
      columns = [
        { key: "period", title: "Период" },
        { key: "orders", title: "Заказы", numeric: true },
        { key: "rolls", title: "Рулоны", numeric: true },
        { key: "material", title: "Метраж", numeric: true },
        { key: "useful", title: "Полезная площадь", numeric: true },
      ];
      const buckets = new Map<string, { orders: number; rolls: number; material: number; useful: number }>();
      for (const session of sessions) {
        const key = bucketLabel(session.createdAt, filter.grouping);
        const bucket = buckets.get(key) ?? { orders: 0, rolls: 0, material: 0, useful: 0 };
        bucket.orders += 1;
        bucket.rolls += session.result.total_rolls;
        bucket.material += session.result.used_length_m;
        bucket.useful += session.result.useful_area_m2;
        buckets.set(key, bucket);
      }
      rows = Array.from(buckets.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([period, bucket]) =>
          makeRow(period, {
            period,
            orders: bucket.orders,
            rolls: bucket.rolls,
            material: fmtM(bucket.material),
            useful: fmtA(bucket.useful),
          }),
        );
    } else {
      columns = [
        { key: "date", title: "Дата" },
        { key: "time", title: "Время" },
        { key: "customer", title: "Заказчик" },
        { key: "orderNumber", title: "№ заказа" },
        { key: "operator", title: "Оператор" },
        { key: "machine", title: "Станок" },
        { key: "coating", title: "Слой" },
        { key: "material", title: "Материал" },
        { key: "jumbo", title: "Джамб" },
        { key: "rolls", title: "Рулоны", numeric: true },
        { key: "meterage", title: "Метраж", numeric: true },
        { key: "useful", title: "Полезная площадь", numeric: true },
        { key: "remainder", title: "Остаток Джамба", numeric: true },
      ];
      rows = sortSessions(sessions, filter.sort).map((session) =>
        makeRow(session.id, {
          date: session.order.date,
          time: session.order.time,
          customer: session.order.customer || "—",
          orderNumber: session.order.orderNumber || "—",
          operator: session.order.operator || "—",
          machine: machineTitle(session.order.machine),
          coating: session.order.coating ? coatingTitle(session.order.coating) : "—",
          material: session.materialCode,
          jumbo: session.jumboStockNumber,
          rolls: session.result.total_rolls,
          meterage: fmtM(session.result.used_length_m),
          useful: fmtA(session.result.useful_area_m2),
          remainder: fmtM(session.result.remaining_jumbo_m),
        }),
      );
    }

    return buildReportData({
      kind: ReportKind.orders,
      title: "Отчёт по заказам",
      filter,
      columns,
      rows,
      summary,
    });
  },
};
