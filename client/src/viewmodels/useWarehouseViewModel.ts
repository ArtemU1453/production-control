import { useEffect, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import type { Jumbo } from "@/models";

interface WarehouseViewModel {
  loading: boolean;
  jumbos: Jumbo[];
}

/**
 * ViewModel for the warehouse screen. The Jumbo repository is already wired; the
 * management UI arrives in a later phase, so the list is currently empty and the
 * screen presents its placeholder state.
 */
export function useWarehouseViewModel(): WarehouseViewModel {
  const { jumbos } = useServices();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Jumbo[]>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const loaded = await jumbos.getAll();
      if (active) {
        setItems(loaded);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [jumbos]);

  return { loading, jumbos: items };
}
