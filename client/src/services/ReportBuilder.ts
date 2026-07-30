import type { ArchivedJumbo } from "../models";
import { nowIso } from "../extensions/date";
import { formatArea, formatMeters, formatPercent } from "../extensions/number";

export interface ReportRow {
  label: string;
  value: string;
}

export interface ReportSection {
  title: string;
  rows: ReportRow[];
}

/** Structured, render-agnostic report data. A PDF renderer in a later phase
 *  consumes this without recomputing anything. */
export interface JumboReportData {
  title: string;
  subtitle: string;
  generatedAt: string;
  sections: ReportSection[];
}

/**
 * Builds the data structure for an archived-Jumbo report. This phase prepares
 * the structure only — no PDF is produced. All values come from the frozen
 * archive statistics, so nothing is recalculated.
 */
export interface ReportBuilder {
  buildJumboReport(archived: ArchivedJumbo): JumboReportData;
}

export function createReportBuilder(): ReportBuilder {
  return {
    buildJumboReport(archived) {
      const { jumbo, statistics } = archived;
      const period = `${archived.usageStartDate ?? "—"} — ${archived.usageEndDate ?? "—"}`;
      return {
        title: `Джамб № ${jumbo.stockNumber}`,
        subtitle: `Материал ${jumbo.materialCode}`,
        generatedAt: nowIso(),
        sections: [
          {
            title: "Общие сведения",
            rows: [
              { label: "Номер складского учёта", value: jumbo.stockNumber },
              { label: "Материал", value: jumbo.materialCode },
              { label: "Период использования", value: period },
              { label: "Оператор архивирования", value: archived.archivedBy ?? "—" },
            ],
          },
          {
            title: "Материал",
            rows: [
              { label: "Начальная намотка", value: formatMeters(statistics.initialWindingM) },
              { label: "Использовано", value: formatMeters(statistics.usedLengthM) },
              { label: "Остаток на закрытии", value: formatMeters(statistics.finalRemainderM) },
            ],
          },
          {
            title: "Площади",
            rows: [
              { label: "Общая площадь", value: formatArea(statistics.totalAreaM2) },
              { label: "Полезная площадь", value: formatArea(statistics.usefulAreaM2) },
              { label: "Брак", value: formatArea(statistics.wasteAreaM2) },
              { label: "Технологический остаток", value: formatArea(statistics.scrapAreaM2) },
              { label: "Общие потери", value: formatArea(statistics.totalLossesM2) },
            ],
          },
          {
            title: "Показатели",
            rows: [
              { label: "Полезное использование", value: formatPercent(statistics.usefulPercent) },
              { label: "Брак", value: formatPercent(statistics.wastePercent) },
              { label: "Технологические потери", value: formatPercent(statistics.scrapPercent) },
              { label: "Заказов", value: String(statistics.ordersCount) },
              { label: "Рулонов", value: String(statistics.rollsCount) },
            ],
          },
        ],
      };
    },
  };
}
