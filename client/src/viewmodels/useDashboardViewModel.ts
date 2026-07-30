import { useCallback, useEffect, useMemo, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import { JumboStatus, type CuttingOrder, type Jumbo } from "@/models";

export interface JumboStatusCounts {
  total: number;
  onStock: number;
  inWork: number;
  toWriteOff: number;
  archived: number;
}

interface DashboardViewModel {
  loading: boolean;
  lastOrder: CuttingOrder | null;
  ordersCount: number;
  materialsCount: number;
  counts: JumboStatusCounts;
  reload: () => Promise<void>;
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

/** ViewModel for the dashboard. Reads the latest saved order and live warehouse
 *  counters straight from the repositories. */
export function useDashboardViewModel(): DashboardViewModel {
  const { cuttingOrders, jumbos, materials } = useServices();
  const [loading, setLoading] = useState(true);
  const [lastOrder, setLastOrder] = useState<CuttingOrder | null>(null);
  const [ordersCount, setOrdersCount] = useState(0);
  const [materialsCount, setMaterialsCount] = useState(0);
  const [jumboList, setJumboList] = useState<Jumbo[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [orders, jumbosData, materialsData] = await Promise.all([
        cuttingOrders.getAll(),
        jumbos.getAll(),
        materials.getAll(),
      ]);
      setOrdersCount(orders.length);
      setLastOrder(orders[0] ?? null);
      setJumboList(jumbosData);
      setMaterialsCount(materialsData.length);
    } finally {
      setLoading(false);
    }
  }, [cuttingOrders, jumbos, materials]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const counts = useMemo(() => countByStatus(jumboList), [jumboList]);

  return { loading, lastOrder, ordersCount, materialsCount, counts, reload };
}
