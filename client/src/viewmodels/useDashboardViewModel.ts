import { useCallback, useEffect, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import type { CuttingOrder } from "@/models";

interface DashboardViewModel {
  loading: boolean;
  lastOrder: CuttingOrder | null;
  ordersCount: number;
  jumbosCount: number;
  reload: () => Promise<void>;
}

/** ViewModel for the dashboard. Reads the latest saved order and counters from
 *  the repositories; warehouse figures are wired but currently empty. */
export function useDashboardViewModel(): DashboardViewModel {
  const { cuttingOrders, jumbos } = useServices();
  const [loading, setLoading] = useState(true);
  const [lastOrder, setLastOrder] = useState<CuttingOrder | null>(null);
  const [ordersCount, setOrdersCount] = useState(0);
  const [jumbosCount, setJumbosCount] = useState(0);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [orders, jumboList] = await Promise.all([
        cuttingOrders.getAll(),
        jumbos.getAll(),
      ]);
      setOrdersCount(orders.length);
      setLastOrder(orders[0] ?? null);
      setJumbosCount(jumboList.length);
    } finally {
      setLoading(false);
    }
  }, [cuttingOrders, jumbos]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { loading, lastOrder, ordersCount, jumbosCount, reload };
}
