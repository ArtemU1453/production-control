import { JumboStatus } from "@/models";
import { ReportGrouping } from "../models/ReportFilter";
import { ReportKind } from "../models/ReportKind";
import type { ReportContext } from "../repositories/ReportContext";
import type { ReportColumn, ReportRow } from "../models/ReportData";
import {
  bucketLabel,
  buildReportData,
  fmtA,
  fmtM,
  fmtP,
  makeRow,
  round1,
  summaryItem,
  type ReportBuilder,
} from "./support";

/** The enterprise production report: period-wide indicators plus an optional
 *  per-period breakdown table when grouping is enabled. */
export const productionBuilder: ReportBuilder = {
  kind: ReportKind.production,
  build(context: ReportContext) {
    const { sessions, jumbos, archived, filter } = context;

    const orders = sessions.length;
    const rolls = sessions.reduce((sum, s) => sum + s.result.total_rolls, 0);
    const jumbosUsed = new Set(sessions.map((s) => s.jumboId)).size;
    const materialUsedM = sessions.reduce((sum, s) => sum + s.result.used_length_m, 0);
    const usefulAreaM2 = sessions.reduce((sum, s) => sum + s.result.useful_area_m2, 0);
    const processedAreaM2 = sessions.reduce(
      (sum, s) => sum + (s.input.materialWidthMm / 1000) * s.result.used_length_m,
      0,
    );
    const wasteAreaM2 = archived.reduce((sum, a) => sum + a.statistics.wasteAreaM2, 0);
    const scrapAreaM2 = archived.reduce((sum, a) => sum + a.statistics.scrapAreaM2, 0);
    const totalLossesM2 = archived.reduce((sum, a) => sum + a.statistics.totalLossesM2, 0);
    const usagePercent = processedAreaM2 > 0 ? (usefulAreaM2 / processedAreaM2) * 100 : 0;
    const avgJumboUsage =
      archived.length > 0
        ? archived.reduce((sum, a) => sum + a.statistics.usefulPercent, 0) / archived.length
        : 0;
    const avgPerOrder = orders > 0 ? materialUsedM / orders : 0;
    const avgPerRoll = rolls > 0 ? materialUsedM / rolls : 0;
    const remainingRawM = jumbos.reduce((sum, j) => sum + j.currentRemainderM, 0);

    const onStock = jumbos.filter((j) => j.status === JumboStatus.onStock).length;
    const inWork = jumbos.filter((j) => j.status === JumboStatus.inWork).length;
    const toWriteOff = jumbos.filter((j) => j.status === JumboStatus.toWriteOff).length;
    const archivedCount = archived.length;

    const summary = [
      summaryItem("orders", "Количество заказов", String(orders)),
      summaryItem("rolls", "Количество рулонов", String(rolls)),
      summaryItem("jumbosUsed", "Использовано Джамбов", String(jumbosUsed)),
      summaryItem("material", "Общий расход материала", fmtM(materialUsedM)),
      summaryItem("useful", "Полезная площадь", fmtA(usefulAreaM2)),
      summaryItem("waste", "Площадь брака", fmtA(wasteAreaM2)),
      summaryItem("scrap", "Технологический остаток", fmtA(scrapAreaM2)),
      summaryItem("losses", "Общие потери", fmtA(totalLossesM2)),
      summaryItem("usage", "Процент использования материала", fmtP(usagePercent)),
      summaryItem("avgJumbo", "Средний % использования Джамба", fmtP(avgJumboUsage)),
      summaryItem("avgOrder", "Средний расход на заказ", fmtM(avgPerOrder)),
      summaryItem("avgRoll", "Средний расход на рулон", fmtM(avgPerRoll)),
      summaryItem("remaining", "Остаток сырья", fmtM(remainingRawM)),
      summaryItem("onStock", "Джамбов на складе", String(onStock)),
      summaryItem("inWork", "Джамбов в работе", String(inWork)),
      summaryItem("toWriteOff", "Джамбов к списанию", String(toWriteOff)),
      summaryItem("archived", "Джамбов в архиве", String(archivedCount)),
    ];

    let columns: ReportColumn[];
    let rows: ReportRow[];

    if (filter.grouping === ReportGrouping.none) {
      columns = [
        { key: "metric", title: "Показатель" },
        { key: "value", title: "Значение", numeric: true },
      ];
      rows = summary.map((item) => makeRow(item.key, { metric: item.label, value: item.value }));
    } else {
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
    }

    return buildReportData({
      kind: ReportKind.production,
      title: "Производственный отчёт",
      filter,
      columns,
      rows,
      summary,
      metadata: { processedAreaM2: round1(processedAreaM2) },
    });
  },
};
