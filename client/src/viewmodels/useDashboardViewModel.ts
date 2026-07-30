import { useCallback, useEffect, useMemo, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import { JumboStatus, type ArchivedJumbo, type CuttingSession, type Jumbo } from "@/models";

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

/** Averages the frozen archive statistics (O(n) over archived Jumbos). */
function computeArchiveTotals(archived: ArchivedJumbo[]): ArchiveTotals {
  if (archived.length === 0) {
    return { archivedCount: 0, avgUsefulPercent: 0, avgWastePercent: 0 };
  }
  let useful = 0;
  let waste = 0;
  for (const entry of archived) {
    useful += entry.statistics.usefulPercent;
    waste += entry.statistics.wastePercent;
  }
  return {
    archivedCount: archived.length,
    avgUsefulPercent: Math.round((useful / archived.length) * 10) / 10,
    avgWastePercent: Math.round((waste / archived.length) * 10) / 10,
  };
}

function countByStatus(jumbos: Jumbo[]): JumboStatusCounts {
  const counts: JumboStatusCounts = {
    total: jumbos.length,
    onStock: 0,
    inWork: 0,
    toWriteOff: 0,
    archived: 0,
  };
  for (const jumbo of jumbos) {
    switch (jumbo.status) {
      case JumboStatus.onStock:
        counts.onStock += 1;
        break;
      case JumboStatus.inWork:
        counts.inWork += 1;
        break;
      case JumboStatus.toWriteOff:
        counts.toWriteOff += 1;
        break;
      case JumboStatus.archived:
        counts.archived += 1;
        break;
    }
  }
  return counts;
}

/**
 * Aggregates production totals from the stored Jumbo accumulators (O(n) over
 * Jumbos) — never by replaying the operation history — plus today's session
 * count.
 */
function computeTotals(jumbos: Jumbo[], sessions: CuttingSession[]): ProductionTotals {
  const today = new Date().toISOString().slice(0, 10);
  let rollsMade = 0;
  let materialUsedM = 0;
  let usefulAreaM2 = 0;
  for (const jumbo of jumbos) {
    rollsMade += jumbo.rollsCount;
    materialUsedM += jumbo.usedLength;
    usefulAreaM2 += jumbo.usefulArea;
  }
  const ordersToday = sessions.filter((s) => s.createdAt.slice(0, 10) === today).length;
  return {
    ordersToday,
    rollsMade,
    materialUsedM: Math.round(materialUsedM),
    usefulAreaM2: Math.round(usefulAreaM2 * 10) / 10,
  };
}

/** ViewModel for the dashboard. Reads live warehouse counters, production
 *  totals and the latest session straight from the repositories. */
export function useDashboardViewModel(): DashboardViewModel {
  const { cuttingSessions, jumbos, materials, archivedJumbos } = useServices();
  const [loading, setLoading] = useState(true);
  const [sessionList, setSessionList] = useState<CuttingSession[]>([]);
  const [jumboList, setJumboList] = useState<Jumbo[]>([]);
  const [archivedList, setArchivedList] = useState<ArchivedJumbo[]>([]);
  const [materialsCount, setMaterialsCount] = useState(0);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [sessions, jumbosData, materialsData, archivedData] = await Promise.all([
        cuttingSessions.getAll(),
        jumbos.getAll(),
        materials.getAll(),
        archivedJumbos.getAll(),
      ]);
      setSessionList(sessions);
      setJumboList(jumbosData);
      setMaterialsCount(materialsData.length);
      setArchivedList(archivedData);
    } finally {
      setLoading(false);
    }
  }, [cuttingSessions, jumbos, materials, archivedJumbos]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const counts = useMemo(() => countByStatus(jumboList), [jumboList]);
  const totals = useMemo(() => computeTotals(jumboList, sessionList), [jumboList, sessionList]);
  const archiveTotals = useMemo(() => computeArchiveTotals(archivedList), [archivedList]);

  return {
    loading,
    lastSession: sessionList[0] ?? null,
    sessionsCount: sessionList.length,
    materialsCount,
    counts,
    totals,
    archiveTotals,
    reload,
  };
}
