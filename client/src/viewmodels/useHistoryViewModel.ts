import { useCallback, useEffect, useMemo, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import type { CuttingSession } from "@/models";

interface HistoryViewModel {
  loading: boolean;
  query: string;
  setQuery: (query: string) => void;
  sessions: CuttingSession[];
  remove: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

function matches(session: CuttingSession, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return [
    session.order.customer,
    session.order.operator,
    session.jumboStockNumber,
    session.materialCode,
  ]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

/**
 * ViewModel for the production history screen. Lists {@link CuttingSession}
 * records — the main production-history entity — with search and deletion.
 */
export function useHistoryViewModel(): HistoryViewModel {
  const { cuttingSessions, warehouse } = useServices();
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [all, setAll] = useState<CuttingSession[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAll(await cuttingSessions.getAll());
    } finally {
      setLoading(false);
    }
  }, [cuttingSessions]);

  useEffect(() => {
    void load();
  }, [load]);

  // Deletion goes through the warehouse service so the source Jumbo's
  // accumulators and remainder are restored — a raw session delete would leave
  // the warehouse, reports and KPI counting a removed order.
  const remove = useCallback(
    async (id: string) => {
      await warehouse.deleteSession(id);
      await load();
    },
    [warehouse, load],
  );

  const clearAll = useCallback(async () => {
    const current = await cuttingSessions.getAll();
    for (const session of current) {
      await warehouse.deleteSession(session.id);
    }
    await load();
  }, [cuttingSessions, warehouse, load]);

  const sessions = useMemo(
    () => all.filter((session) => matches(session, query)),
    [all, query],
  );

  return { loading, query, setQuery, sessions, remove, clearAll };
}
