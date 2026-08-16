import { useEffect, useMemo, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import type { CuttingSession, FinishedRoll } from "@/models";
import { buildSessionReport, type SessionReport } from "@/views/history/sessionReport";

interface HistoryDetailViewModel {
  loading: boolean;
  session: CuttingSession | null;
  /** Structured report for the session, or null while loading / not found. */
  report: SessionReport | null;
}

/**
 * ViewModel for a single production-history record. Loads the persisted
 * {@link CuttingSession} snapshot and the finished-goods rolls linked to it,
 * then derives the structured {@link SessionReport} (no cutting math is re-run —
 * everything comes from stored data). Backward compatible: sessions saved before
 * defects/finished-goods existed simply report empty movement / no defects.
 */
export function useHistoryDetailViewModel(sessionId: string): HistoryDetailViewModel {
  const { cuttingSessions, finishedRolls } = useServices();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<CuttingSession | null>(null);
  const [rolls, setRolls] = useState<FinishedRoll[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void (async () => {
      const [found, allRolls] = await Promise.all([
        cuttingSessions.getById(sessionId),
        finishedRolls.getAll(),
      ]);
      if (!active) {
        return;
      }
      setSession(found ?? null);
      setRolls(allRolls);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [cuttingSessions, finishedRolls, sessionId]);

  const report = useMemo(
    () => (session ? buildSessionReport(session, rolls) : null),
    [session, rolls],
  );

  return { loading, session, report };
}
