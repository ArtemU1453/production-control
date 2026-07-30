import { ReportSort } from "../models/ReportFilter";
import { ReportKind } from "../models/ReportKind";
import type { ReportContext } from "../repositories/ReportContext";
import {
  applySort,
  buildReportData,
  fmtA,
  fmtM,
  fmtP,
  jumboLines,
  makeRow,
  round1,
  summaryItem,
  type ReportBuilder,
} from "./support";

/** One row per Jumbo (active and archived), with usage and losses. */
export const jumbosBuilder: ReportBuilder = {
  kind: ReportKind.jumbos,
  build(context: ReportContext) {
    const lines = jumboLines(context);

    const rows = lines.map((line) =>
      makeRow(`${line.stockNumber}-${line.archived ? "a" : "j"}`, {
        stock: line.stockNumber,
        material: line.materialCode,
        initial: fmtM(line.initialWindingM),
        used: fmtM(line.usedLength),
        remainder: fmtM(line.remainderM),
        useful: fmtA(line.usefulArea),
        waste: fmtA(line.wasteArea),
        scrap: fmtA(line.scrapArea),
        losses: fmtA(line.totalLosses),
        usage: fmtP(line.usagePercent),
        open: line.openDate.slice(0, 10),
        close: line.closeDate.length > 10 ? line.closeDate.slice(0, 10) : line.closeDate,
        _usage: line.usagePercent,
        _orders: line.ordersCount,
      }),
    );

    const sorted = applySort(rows, context.filter.sort, {
      [ReportSort.material]: (row) => row.cells.material,
      [ReportSort.usage]: (row) => Number(row.cells._usage),
      [ReportSort.orders]: (row) => Number(row.cells._orders),
      [ReportSort.date]: (row) => String(row.cells.open),
    });

    const totalUsed = lines.reduce((sum, l) => sum + l.usedLength, 0);
    const totalUseful = lines.reduce((sum, l) => sum + l.usefulArea, 0);
    const avgUsage = lines.length > 0 ? lines.reduce((s, l) => s + l.usagePercent, 0) / lines.length : 0;

    return buildReportData({
      kind: ReportKind.jumbos,
      title: "Отчёт по Джамбам",
      filter: context.filter,
      columns: [
        { key: "stock", title: "№ Джамба" },
        { key: "material", title: "Материал" },
        { key: "initial", title: "Нач. намотка", numeric: true },
        { key: "used", title: "Использовано", numeric: true },
        { key: "remainder", title: "Остаток", numeric: true },
        { key: "useful", title: "Полезная", numeric: true },
        { key: "waste", title: "Брак", numeric: true },
        { key: "scrap", title: "Тех. остаток", numeric: true },
        { key: "losses", title: "Общие потери", numeric: true },
        { key: "usage", title: "% исп.", numeric: true },
        { key: "open", title: "Открытие" },
        { key: "close", title: "Закрытие" },
      ],
      rows: sorted,
      summary: [
        summaryItem("count", "Количество Джамбов", String(lines.length)),
        summaryItem("used", "Использовано всего", fmtM(totalUsed)),
        summaryItem("useful", "Полезная площадь всего", fmtA(totalUseful)),
        summaryItem("avgUsage", "Средний % использования", fmtP(round1(avgUsage))),
      ],
    });
  },
};
