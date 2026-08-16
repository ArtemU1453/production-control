import { JumboStatus, Machine } from "@/models";

/** Time grouping applied to time-based reports. */
export enum ReportGrouping {
  none = "none",
  day = "day",
  week = "week",
  month = "month",
  quarter = "quarter",
  year = "year",
}

/** Row sort order for list reports. */
export enum ReportSort {
  date = "date",
  material = "material",
  operator = "operator",
  machine = "machine",
  orders = "orders",
  usage = "usage",
}

/** Universal filter shared by every report. All fields are optional except the
 *  grouping/sort selectors, which always have a value. */
export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  materialCode?: string;
  operator?: string;
  machine?: Machine;
  customer?: string;
  jumboNumber?: string;
  status?: JumboStatus;
  grouping: ReportGrouping;
  sort: ReportSort;
}

export const defaultReportFilter: ReportFilter = {
  grouping: ReportGrouping.none,
  sort: ReportSort.date,
};

const groupingTitles: Record<ReportGrouping, string> = {
  [ReportGrouping.none]: "Без группировки",
  [ReportGrouping.day]: "По дням",
  [ReportGrouping.week]: "По неделям",
  [ReportGrouping.month]: "По месяцам",
  [ReportGrouping.quarter]: "По кварталам",
  [ReportGrouping.year]: "По годам",
};

const sortTitles: Record<ReportSort, string> = {
  [ReportSort.date]: "По дате",
  [ReportSort.material]: "По материалу",
  [ReportSort.operator]: "По оператору",
  [ReportSort.machine]: "По станку",
  [ReportSort.orders]: "По заказам",
  [ReportSort.usage]: "По расходу",
};

export function groupingTitle(grouping: ReportGrouping): string {
  return groupingTitles[grouping];
}

export function sortTitle(sort: ReportSort): string {
  return sortTitles[sort];
}

/** Stable signature of a filter, used as part of the cache key. */
export function reportFilterKey(filter: ReportFilter): string {
  return JSON.stringify({
    startDate: filter.startDate ?? "",
    endDate: filter.endDate ?? "",
    materialCode: filter.materialCode ?? "",
    operator: filter.operator ?? "",
    machine: filter.machine ?? "",
    customer: filter.customer ?? "",
    jumboNumber: filter.jumboNumber ?? "",
    status: filter.status ?? "",
    grouping: filter.grouping,
    sort: filter.sort,
  });
}

export { JumboStatus, Machine };
