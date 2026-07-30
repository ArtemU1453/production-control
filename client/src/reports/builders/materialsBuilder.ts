import { ReportSort } from "../models/ReportFilter";
import { ReportKind } from "../models/ReportKind";
import type { ReportContext } from "../repositories/ReportContext";
import {
  applySort,
  buildReportData,
  fmtA,
  fmtM,
  jumboLines,
  makeRow,
  round1,
  summaryItem,
  type ReportBuilder,
} from "./support";

interface MaterialAggregate {
  jumbos: number;
  meterage: number;
  used: number;
  remainder: number;
  useful: number;
  orders: number;
}

/** One row per material, aggregating its Jumbos. */
export const materialsBuilder: ReportBuilder = {
  kind: ReportKind.materials,
  build(context: ReportContext) {
    const lines = jumboLines(context);
    const groups = new Map<string, MaterialAggregate>();
    for (const line of lines) {
      const agg = groups.get(line.materialCode) ?? {
        jumbos: 0,
        meterage: 0,
        used: 0,
        remainder: 0,
        useful: 0,
        orders: 0,
      };
      agg.jumbos += 1;
      agg.meterage += line.initialWindingM;
      agg.used += line.usedLength;
      agg.remainder += line.remainderM;
      agg.useful += line.usefulArea;
      agg.orders += line.ordersCount;
      groups.set(line.materialCode, agg);
    }

    const rows = applySort(
      Array.from(groups.entries()).map(([code, agg]) =>
        makeRow(code, {
          material: code,
          jumbos: agg.jumbos,
          meterage: fmtM(agg.meterage),
          used: fmtM(agg.used),
          remainder: fmtM(agg.remainder),
          useful: fmtA(agg.useful),
          orders: agg.orders,
          _orders: agg.orders,
          _usage: round1(agg.used),
        }),
      ),
      context.filter.sort,
      {
        [ReportSort.material]: (row) => row.cells.material,
        [ReportSort.orders]: (row) => Number(row.cells._orders),
        [ReportSort.usage]: (row) => Number(row.cells._usage),
      },
    );

    return buildReportData({
      kind: ReportKind.materials,
      title: "Отчёт по материалам",
      filter: context.filter,
      columns: [
        { key: "material", title: "Материал" },
        { key: "jumbos", title: "Джамбов", numeric: true },
        { key: "meterage", title: "Общий метраж", numeric: true },
        { key: "used", title: "Использовано", numeric: true },
        { key: "remainder", title: "Остаток", numeric: true },
        { key: "useful", title: "Полезная площадь", numeric: true },
        { key: "orders", title: "Заказов", numeric: true },
      ],
      rows,
      summary: [
        summaryItem("materials", "Материалов", String(groups.size)),
        summaryItem("jumbos", "Джамбов", String(lines.length)),
        summaryItem("used", "Использовано всего", fmtM(lines.reduce((s, l) => s + l.usedLength, 0))),
      ],
    });
  },
};
