import { JumboStatus, jumboStatusTitle, type ArchivedJumbo, type Jumbo } from "@/models";
import { nowIso } from "@/extensions/date";
import { makeId } from "@/utilities/id";
import {
  ReportGrouping,
  ReportSort,
  type ReportFilter,
} from "../models/ReportFilter";
import type { ReportKind } from "../models/ReportKind";
import type {
  ReportColumn,
  ReportData,
  ReportRow,
  ReportSummaryItem,
} from "../models/ReportData";
import type { ReportContext } from "../repositories/ReportContext";

/**
 * ReportBuilderProtocol.
 *
 * Every report implements this single protocol. A builder receives only the
 * prepared {@link ReportContext} (never the storage layer) and returns a
 * {@link ReportData}. New reports are added by implementing this protocol and
 * registering the builder — existing builders are never modified (Open/Closed).
 */
export interface ReportBuilder {
  readonly kind: ReportKind;
  build(context: ReportContext): ReportData;
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function fmtM(value: number): string {
  return `${round1(value)} м`;
}

export function fmtA(value: number): string {
  return `${round1(value)} м²`;
}

export function fmtP(value: number): string {
  return `${round1(value)}%`;
}

export function periodLabel(filter: ReportFilter): string {
  if (filter.startDate && filter.endDate) {
    return `${filter.startDate} — ${filter.endDate}`;
  }
  if (filter.startDate) {
    return `с ${filter.startDate}`;
  }
  if (filter.endDate) {
    return `по ${filter.endDate}`;
  }
  return "Весь период";
}

function isoWeek(date: Date): number {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = (tmp.getUTCDay() + 6) % 7;
  tmp.setUTCDate(tmp.getUTCDate() - dayNumber + 3);
  const firstThursday = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
  const firstDayNumber = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNumber + 3);
  return 1 + Math.round((tmp.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
}

/** Bucket label for a timestamp under the chosen grouping. */
export function bucketLabel(iso: string, grouping: ReportGrouping): string {
  const day = iso.slice(0, 10);
  const year = iso.slice(0, 4);
  switch (grouping) {
    case ReportGrouping.day:
      return day;
    case ReportGrouping.week: {
      const date = new Date(iso);
      return `${year}-W${String(isoWeek(date)).padStart(2, "0")}`;
    }
    case ReportGrouping.month:
      return iso.slice(0, 7);
    case ReportGrouping.quarter: {
      const month = Number(iso.slice(5, 7));
      return `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
    }
    case ReportGrouping.year:
      return year;
    case ReportGrouping.none:
      return "";
  }
}

/** Sorts rows by the requested order using per-column accessors. */
export function applySort(
  rows: ReportRow[],
  sort: ReportSort,
  accessors: Partial<Record<ReportSort, (row: ReportRow) => string | number>>,
): ReportRow[] {
  const accessor = accessors[sort];
  if (!accessor) {
    return rows;
  }
  const numeric = sort === ReportSort.orders || sort === ReportSort.usage;
  return [...rows].sort((a, b) => {
    const left = accessor(a);
    const right = accessor(b);
    if (numeric) {
      return Number(right) - Number(left);
    }
    return String(left).localeCompare(String(right));
  });
}

export function summaryItem(key: string, label: string, value: string): ReportSummaryItem {
  return { key, label, value };
}

export function makeRow(id: string, cells: Record<string, string | number>): ReportRow {
  return { id, cells };
}

/** Assembles a ReportData with generated id, timestamp and period. */
export function buildReportData(args: {
  kind: ReportKind;
  title: string;
  filter: ReportFilter;
  columns: ReportColumn[];
  rows: ReportRow[];
  summary: ReportSummaryItem[];
  metadata?: Record<string, string | number>;
}): ReportData {
  return {
    id: makeId(),
    kind: args.kind,
    title: args.title,
    generatedAt: nowIso(),
    period: {
      startDate: args.filter.startDate,
      endDate: args.filter.endDate,
      label: periodLabel(args.filter),
    },
    filter: args.filter,
    table: { columns: args.columns, rows: args.rows },
    summary: args.summary,
    metadata: {
      grouping: args.filter.grouping,
      sort: args.filter.sort,
      rowCount: args.rows.length,
      ...args.metadata,
    },
  };
}

/** Normalized Jumbo line unifying active and archived Jumbos for the jumbo,
 *  stock and material reports. */
export interface JumboLine {
  stockNumber: string;
  materialCode: string;
  status: JumboStatus;
  statusTitle: string;
  widthMm: number;
  initialWindingM: number;
  usedLength: number;
  remainderM: number;
  usefulArea: number;
  wasteArea: number;
  scrapArea: number;
  totalLosses: number;
  usagePercent: number;
  ordersCount: number;
  rollsCount: number;
  arrivalDate: string;
  openDate: string;
  closeDate: string;
  archived: boolean;
}

function lineFromJumbo(jumbo: Jumbo): JumboLine {
  return {
    stockNumber: jumbo.stockNumber,
    materialCode: jumbo.materialCode,
    status: jumbo.status,
    statusTitle: jumboStatusTitle(jumbo.status),
    widthMm: jumbo.widthMm,
    initialWindingM: jumbo.initialWindingM,
    usedLength: round1(jumbo.usedLength),
    remainderM: round1(jumbo.currentRemainderM),
    usefulArea: round1(jumbo.usefulArea),
    wasteArea: round1(jumbo.wasteArea),
    scrapArea: round1(jumbo.scrapArea),
    totalLosses: round1(jumbo.wasteArea + jumbo.scrapArea),
    usagePercent: round1(jumbo.efficiency * 100),
    ordersCount: jumbo.ordersCount,
    rollsCount: jumbo.rollsCount,
    arrivalDate: jumbo.arrivalDate,
    openDate: jumbo.usageStartDate ?? jumbo.arrivalDate,
    closeDate: "—",
    archived: false,
  };
}

function lineFromArchived(entry: ArchivedJumbo): JumboLine {
  const { jumbo, statistics } = entry;
  return {
    stockNumber: jumbo.stockNumber,
    materialCode: jumbo.materialCode,
    status: jumbo.status,
    statusTitle: jumboStatusTitle(jumbo.status),
    widthMm: jumbo.widthMm,
    initialWindingM: statistics.initialWindingM,
    usedLength: statistics.usedLengthM,
    remainderM: statistics.finalRemainderM,
    usefulArea: statistics.usefulAreaM2,
    wasteArea: statistics.wasteAreaM2,
    scrapArea: statistics.scrapAreaM2,
    totalLosses: statistics.totalLossesM2,
    usagePercent: statistics.usefulPercent,
    ordersCount: statistics.ordersCount,
    rollsCount: statistics.rollsCount,
    arrivalDate: jumbo.arrivalDate,
    openDate: entry.usageStartDate ?? jumbo.arrivalDate,
    closeDate: entry.usageEndDate ?? entry.archivedAt,
    archived: true,
  };
}

/** All Jumbos (active + archived) as unified lines. */
export function jumboLines(context: ReportContext): JumboLine[] {
  return [
    ...context.jumbos.map(lineFromJumbo),
    ...context.archived.map(lineFromArchived),
  ];
}
