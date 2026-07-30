import { useCallback, useEffect, useMemo, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import { Machine } from "@/models";
import { defaultReportFilter, ReportGrouping, type ReportFilter } from "@/reports";
import {
  ComparisonKind,
  type AnalyticsOverview,
  type PeriodComparison,
} from "../models";

interface AnalyticsViewModel {
  loading: boolean;
  overview: AnalyticsOverview | null;
  comparison: PeriodComparison | null;
  filter: ReportFilter;
  updateFilter: <K extends keyof ReportFilter>(key: K, value: ReportFilter[K]) => void;
  resetFilter: () => void;
  comparisonKind: ComparisonKind;
  setComparisonKind: (kind: ComparisonKind) => void;
  materialOptions: string[];
  operatorOptions: string[];
  machineOptions: Machine[];
}

/**
 * ViewModel for the analytics center. Owns the filter and the comparison kind,
 * and pulls all KPI data from the shared {@link AnalyticsService} — which caches
 * results by filter + data signature, so re-computation only happens when the
 * filter or the underlying data changes.
 */
export function useAnalyticsViewModel(): AnalyticsViewModel {
  const { analytics } = useServices();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [comparison, setComparison] = useState<PeriodComparison | null>(null);
  const [filter, setFilter] = useState<ReportFilter>({
    ...defaultReportFilter,
    grouping: ReportGrouping.month,
  });
  const [comparisonKind, setComparisonKind] = useState<ComparisonKind>(
    ComparisonKind.monthOverMonth,
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    void (async () => {
      const result = await analytics.overview(filter);
      if (active) {
        setOverview(result);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [analytics, filter]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const result = await analytics.comparison(comparisonKind);
      if (active) {
        setComparison(result);
      }
    })();
    return () => {
      active = false;
    };
  }, [analytics, comparisonKind]);

  const updateFilter = useCallback(
    <K extends keyof ReportFilter>(key: K, value: ReportFilter[K]) => {
      setFilter((previous) => ({ ...previous, [key]: value }));
    },
    [],
  );

  const resetFilter = useCallback(
    () => setFilter({ ...defaultReportFilter, grouping: ReportGrouping.month }),
    [],
  );

  const materialOptions = useMemo(
    () => (overview ? overview.materials.map((m) => m.materialCode).sort() : []),
    [overview],
  );
  const operatorOptions = useMemo(
    () => (overview ? overview.operators.map((o) => o.operator).sort() : []),
    [overview],
  );

  return {
    loading,
    overview,
    comparison,
    filter,
    updateFilter,
    resetFilter,
    comparisonKind,
    setComparisonKind,
    materialOptions,
    operatorOptions,
    machineOptions: [Machine.machine1, Machine.machine2],
  };
}
