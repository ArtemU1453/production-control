import { useCallback, useEffect, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import { ComparisonKind } from "@/analytics";
import type { CuttingSession } from "@/models";

export interface JumboStatusCounts {
  total: number;
  onStock: number;
  inWork: number;
  toWriteOff: number;
  archived: number;
}

export interface ProductionTotals {
  ordersToday: number;
  rollsMade: number;
  materialUsedM: number;
  usefulAreaM2: number;
}

export interface ArchiveTotals {
  archivedCount: number;
  avgUsefulPercent: number;
  avgWastePercent: number;
}

interface DashboardViewModel {
  loading: boolean;
  lastSession: CuttingSession | null;
  sessionsCount: number;
  materialsCount: number;
  counts: JumboStatusCounts;
  totals: ProductionTotals;
  archiveTotals: ArchiveTotals;
  reload: () => Promise<void>;
}

const emptyCounts: JumboStatusCounts = { total: 0, onStock: 0, inWork: 0, toWriteOff: 0, archived: 0 };
const emptyTotals: ProductionTotals = { ordersToday: 0, rollsMade: 0, materialUsedM: 0, usefulAreaM2: 0 };
const emptyArchive: ArchiveTotals = { archivedCount: 0, avgUsefulPercent: 0, avgWastePercent: 0 };

/**
 * ViewModel for the dashboard. All aggregation is delegated to the shared
 * analytics engine (via {@link AnalyticsService}) so the Dashboard and the
 * Analytics screen never duplicate KPI calculations.
 */
export function useDashboardViewModel(): DashboardViewModel {
  const { analytics, cuttingSessions } = useServices();
  const [loading, setLoading] = useState(true);
  const [lastSession, setLastSession] = useState<CuttingSession | null>(null);
  const [sessionsCount, setSessionsCount] = useState(0);
  const [materialsCount, setMaterialsCount] = useState(0);
  const [counts, setCounts] = useState<JumboStatusCounts>(emptyCounts);
  const [totals, setTotals] = useState<ProductionTotals>(emptyTotals);
  const [archiveTotals, setArchiveTotals] = useState<ArchiveTotals>(emptyArchive);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [overview, today, sessions] = await Promise.all([
        analytics.overview(),
        analytics.comparison(ComparisonKind.dayOverDay),
        cuttingSessions.getAll(),
      ]);
      const { production, jumbos } = overview;
      setCounts({
        total: jumbos.total,
        onStock: jumbos.onStock,
        inWork: jumbos.inWork,
        toWriteOff: jumbos.toWriteOff,
        archived: jumbos.archived,
      });
      setTotals({
        ordersToday: today.metrics.find((m) => m.key === "orders")?.current ?? 0,
        rollsMade: production.rolls,
        materialUsedM: production.materialUsedM,
        usefulAreaM2: production.usefulAreaM2,
      });
      const lossBase = production.usefulAreaM2 + production.totalLossesM2;
      setArchiveTotals({
        archivedCount: jumbos.archived,
        avgUsefulPercent: jumbos.avgUsagePercent,
        avgWastePercent: lossBase > 0 ? Math.round((production.wasteAreaM2 / lossBase) * 1000) / 10 : 0,
      });
      setMaterialsCount(overview.materials.length);
      setSessionsCount(sessions.length);
      setLastSession(sessions[0] ?? null);
    } finally {
      setLoading(false);
    }
  }, [analytics, cuttingSessions]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    loading,
    lastSession,
    sessionsCount,
    materialsCount,
    counts,
    totals,
    archiveTotals,
    reload,
  };
}
