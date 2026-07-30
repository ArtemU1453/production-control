import { useCallback, useEffect, useMemo, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import { JumboStatus, Machine } from "@/models";
import {
  defaultReportFilter,
  reportDefinition,
  type ReportData,
  type ReportFilter,
  type ReportKind,
} from "../models";

interface ReportPreviewViewModel {
  loading: boolean;
  title: string;
  report: ReportData | null;
  filter: ReportFilter;
  updateFilter: <K extends keyof ReportFilter>(key: K, value: ReportFilter[K]) => void;
  resetFilter: () => void;
  materialOptions: string[];
  operatorOptions: string[];
  machineOptions: Machine[];
  statusOptions: JumboStatus[];
}

/**
 * ViewModel for the report preview. It owns the filter (period, material,
 * operator, machine, status, grouping, sort) and regenerates the report through
 * the Report Center whenever the filter changes; repeated generations with
 * unchanged data are served from the cache.
 */
export function useReportPreviewViewModel(kind: ReportKind): ReportPreviewViewModel {
  const { reportCenter, materials, jumbos, cuttingSessions } = useServices();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportData | null>(null);
  const [filter, setFilter] = useState<ReportFilter>(defaultReportFilter);
  const [materialOptions, setMaterialOptions] = useState<string[]>([]);
  const [operatorOptions, setOperatorOptions] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [materialList, jumboList, sessionList] = await Promise.all([
        materials.getAll(),
        jumbos.getAll(),
        cuttingSessions.getAll(),
      ]);
      if (!active) {
        return;
      }
      const codes = new Set<string>(materialList.map((m) => m.code));
      for (const jumbo of jumboList) {
        codes.add(jumbo.materialCode);
      }
      setMaterialOptions(Array.from(codes).sort());
      setOperatorOptions(
        Array.from(new Set(sessionList.map((s) => s.order.operator).filter(Boolean))).sort(),
      );
    })();
    return () => {
      active = false;
    };
  }, [materials, jumbos, cuttingSessions]);

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await reportCenter.service.generate(kind, filter));
    } finally {
      setLoading(false);
    }
  }, [reportCenter, kind, filter]);

  useEffect(() => {
    void generate();
  }, [generate]);

  const updateFilter = useCallback(
    <K extends keyof ReportFilter>(key: K, value: ReportFilter[K]) => {
      setFilter((previous) => ({ ...previous, [key]: value }));
    },
    [],
  );

  const resetFilter = useCallback(() => setFilter(defaultReportFilter), []);

  const machineOptions = useMemo(() => [Machine.machine1, Machine.machine2], []);
  const statusOptions = useMemo(
    () => [JumboStatus.onStock, JumboStatus.inWork, JumboStatus.toWriteOff, JumboStatus.archived],
    [],
  );

  return {
    loading,
    title: reportDefinition(kind).title,
    report,
    filter,
    updateFilter,
    resetFilter,
    materialOptions,
    operatorOptions,
    machineOptions,
    statusOptions,
  };
}
