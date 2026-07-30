import { useCallback, useEffect, useMemo, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import type { CuttingOrder } from "@/models";

interface HistoryViewModel {
  loading: boolean;
  query: string;
  setQuery: (query: string) => void;
  orders: CuttingOrder[];
  remove: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

function matches(order: CuttingOrder, query: string): boolean {
  if (!query.trim()) {
    return true;
  }
  const haystack = [
    order.operator ?? "",
    order.note ?? "",
    String(order.input.rollWidthMm),
    String(order.input.rollLengthM),
    String(order.input.orderRolls),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

/** ViewModel for the history screen: loads saved orders and supports search and
 *  deletion. */
export function useHistoryViewModel(): HistoryViewModel {
  const { cuttingOrders } = useServices();
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [orders, setOrders] = useState<CuttingOrder[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await cuttingOrders.getAll());
    } finally {
      setLoading(false);
    }
  }, [cuttingOrders]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = useCallback(
    async (id: string) => {
      await cuttingOrders.delete(id);
      await load();
    },
    [cuttingOrders, load],
  );

  const clearAll = useCallback(async () => {
    await cuttingOrders.clear();
    await load();
  }, [cuttingOrders, load]);

  const filtered = useMemo(
    () => orders.filter((order) => matches(order, query)),
    [orders, query],
  );

  return { loading, query, setQuery, orders: filtered, remove, clearAll };
}
