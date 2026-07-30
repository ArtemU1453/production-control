import {
  defaultReportFilter,
  reportFilterKey,
  type ReportFilter,
  type ReportRepository,
} from "@/reports";
import type { KpiEngine } from "./KpiEngine";
import {
  ComparisonKind,
  type AnalyticsOverview,
  type ComparisonMetric,
  type PeriodComparison,
  type ProductionKpi,
} from "./models";

/**
 * Analytics facade.
 *
 * Loads data once through the shared {@link ReportRepository} aggregation
 * gateway, delegates all computation to the pure {@link KpiEngine}, and caches
 * results by filter + data signature so re-opening a screen with unchanged data
 * does no work. It is the single analytics source, reused by the Dashboard.
 */
export interface AnalyticsService {
  overview(filter?: ReportFilter): Promise<AnalyticsOverview>;
  comparison(kind: ComparisonKind): Promise<PeriodComparison>;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function fmt(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

interface Range {
  startDate: string;
  endDate: string;
  label: string;
}

function rangesFor(kind: ComparisonKind, now: Date): { current: Range; previous: Range } {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (kind) {
    case ComparisonKind.dayOverDay: {
      const yesterday = new Date(y, m, now.getDate() - 1);
      return {
        current: { startDate: fmt(now), endDate: fmt(now), label: "Сегодня" },
        previous: { startDate: fmt(yesterday), endDate: fmt(yesterday), label: "Вчера" },
      };
    }
    case ComparisonKind.monthOverMonth: {
      const curStart = new Date(y, m, 1);
      const curEnd = new Date(y, m + 1, 0);
      const prevStart = new Date(y, m - 1, 1);
      const prevEnd = new Date(y, m, 0);
      return {
        current: { startDate: fmt(curStart), endDate: fmt(curEnd), label: "Этот месяц" },
        previous: { startDate: fmt(prevStart), endDate: fmt(prevEnd), label: "Прошлый месяц" },
      };
    }
    case ComparisonKind.yearOverYear:
      return {
        current: { startDate: `${y}-01-01`, endDate: `${y}-12-31`, label: `${y}` },
        previous: { startDate: `${y - 1}-01-01`, endDate: `${y - 1}-12-31`, label: `${y - 1}` },
      };
  }
}

function deltaPercent(current: number, previous: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function comparisonMetrics(current: ProductionKpi, previous: ProductionKpi): ComparisonMetric[] {
  const rows: Array<{ key: string; label: string; unit: string; pick: (k: ProductionKpi) => number }> = [
    { key: "orders", label: "Заказы", unit: "", pick: (k) => k.orders },
    { key: "rolls", label: "Рулоны", unit: "", pick: (k) => k.rolls },
    { key: "material", label: "Расход материала", unit: "м", pick: (k) => k.materialUsedM },
    { key: "useful", label: "Полезная площадь", unit: "м²", pick: (k) => k.usefulAreaM2 },
    { key: "usage", label: "Использование", unit: "%", pick: (k) => k.avgUsagePercent },
  ];
  return rows.map((row) => {
    const cur = row.pick(current);
    const prev = row.pick(previous);
    return { key: row.key, label: row.label, current: cur, previous: prev, deltaPercent: deltaPercent(cur, prev), unit: row.unit };
  });
}

export function createAnalyticsService(
  repository: ReportRepository,
  engine: KpiEngine,
): AnalyticsService {
  const cache = new Map<string, AnalyticsOverview>();

  return {
    async overview(filter = defaultReportFilter) {
      const context = await repository.loadContext(filter);
      const key = `${reportFilterKey(filter)}|${context.signature}`;
      const cached = cache.get(key);
      if (cached) {
        return cached;
      }
      const result = engine.overview(context);
      cache.set(key, result);
      return result;
    },

    async comparison(kind) {
      const { current, previous } = rangesFor(kind, new Date());
      const currentFilter: ReportFilter = {
        ...defaultReportFilter,
        startDate: current.startDate,
        endDate: current.endDate,
      };
      const previousFilter: ReportFilter = {
        ...defaultReportFilter,
        startDate: previous.startDate,
        endDate: previous.endDate,
      };
      const [currentContext, previousContext] = await Promise.all([
        repository.loadContext(currentFilter),
        repository.loadContext(previousFilter),
      ]);
      return {
        kind,
        currentLabel: current.label,
        previousLabel: previous.label,
        metrics: comparisonMetrics(
          engine.production(currentContext),
          engine.production(previousContext),
        ),
      };
    },
  };
}
