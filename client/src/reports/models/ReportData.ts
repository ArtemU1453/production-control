import type { ReportFilter } from "./ReportFilter";
import type { ReportKind } from "./ReportKind";

export interface ReportColumn {
  key: string;
  title: string;
  /** Right-aligned numeric column. */
  numeric?: boolean;
}

export interface ReportRow {
  id: string;
  cells: Record<string, string | number>;
}

export interface ReportTable {
  columns: ReportColumn[];
  rows: ReportRow[];
}

export interface ReportSummaryItem {
  key: string;
  label: string;
  value: string;
}

export interface ReportPeriod {
  startDate?: string;
  endDate?: string;
  label: string;
}

/**
 * The universal, render-agnostic report model. It is the single source for
 * every future export target (PDF, Excel, CSV, Email, API): each consumer walks
 * `table.columns` / `table.rows` and `summary` without recomputing anything.
 */
export interface ReportData {
  id: string;
  kind: ReportKind;
  title: string;
  generatedAt: string;
  period: ReportPeriod;
  filter: ReportFilter;
  table: ReportTable;
  summary: ReportSummaryItem[];
  metadata: Record<string, string | number>;
}
