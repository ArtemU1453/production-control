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
    session.order.orderNumber,
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
  const { cuttingSessions } = useServices();
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

  const remove = useCallback(
    async (id: string) => {
      await cuttingSessions.delete(id);
      await load();
    },
    [cuttingSessions, load],
  );

  const clearAll = useCallback(async () => {
    await cuttingSessions.clear();
    await load();
  }, [cuttingSessions, load]);

  const sessions = useMemo(
    () => all.filter((session) => matches(session, query)),
    [all, query],
  );

  return { loading, query, setQuery, sessions, remove, clearAll };
}
