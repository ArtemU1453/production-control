import { JumboStatus, jumboStatusTitle } from "@/models";
import { ReportSort } from "../models/ReportFilter";
import { ReportKind } from "../models/ReportKind";
import type { ReportContext } from "../repositories/ReportContext";
import {
  applySort,
  buildReportData,
  fmtM,
  jumboLines,
  makeRow,
  summaryItem,
  type ReportBuilder,
} from "./support";

/** All Jumbos with status, remainder, material and dates. */
export const stockBuilder: ReportBuilder = {
  kind: ReportKind.stock,
  build(context: ReportContext) {
    const lines = jumboLines(context);

    const rows = applySort(
      lines.map((line) =>
        makeRow(`${line.stockNumber}-${line.archived ? "a" : "j"}`, {
          stock: line.stockNumber,
          material: line.materialCode,
          status: line.statusTitle,
          remainder: fmtM(line.remainderM),
          arrival: line.arrivalDate.slice(0, 10),
          open: line.openDate.slice(0, 10),
        }),
      ),
      context.filter.sort,
      {
        [ReportSort.material]: (row) => row.cells.material,
        [ReportSort.date]: (row) => String(row.cells.arrival),
      },
    );

    const count = (status: JumboStatus) => lines.filter((l) => l.status === status).length;

    return buildReportData({
      kind: ReportKind.stock,
      title: "Отчёт по складу",
      filter: context.filter,
      columns: [
        { key: "stock", title: "№ Джамба" },
        { key: "material", title: "Материал" },
        { key: "status", title: "Статус" },
        { key: "remainder", title: "Остаток", numeric: true },
        { key: "arrival", title: "Поступление" },
        { key: "open", title: "Начало исп." },
      ],
      rows,
      summary: [
        summaryItem("onStock", jumboStatusTitle(JumboStatus.onStock), String(count(JumboStatus.onStock))),
        summaryItem("inWork", jumboStatusTitle(JumboStatus.inWork), String(count(JumboStatus.inWork))),
        summaryItem("toWriteOff", jumboStatusTitle(JumboStatus.toWriteOff), String(count(JumboStatus.toWriteOff))),
        summaryItem("archived", jumboStatusTitle(JumboStatus.archived), String(count(JumboStatus.archived))),
      ],
    });
  },
};
