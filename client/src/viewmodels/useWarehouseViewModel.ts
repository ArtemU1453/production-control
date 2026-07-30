import { useCallback, useEffect, useMemo, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import { jumboStatusTitle, JumboStatus, type Jumbo, type Material } from "@/models";

export type WarehouseFilter = "all" | JumboStatus;
export type WarehouseSortKey = "arrivalDate" | "material" | "remainder" | "stockNumber";

interface WarehouseViewModel {
  loading: boolean;
  jumbos: Jumbo[];
  materialsById: Map<string, Material>;
  query: string;
  setQuery: (value: string) => void;
  filter: WarehouseFilter;
  setFilter: (value: WarehouseFilter) => void;
  sortKey: WarehouseSortKey;
  setSortKey: (value: WarehouseSortKey) => void;
  counts: Record<WarehouseFilter, number>;
  startUsage: (jumboId: string) => Promise<void>;
  reload: () => Promise<void>;
}

function materialName(jumbo: Jumbo, materials: Map<string, Material>): string {
  return materials.get(jumbo.materialId)?.name ?? "";
}

function matches(jumbo: Jumbo, query: string, materials: Map<string, Material>): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return [
    jumbo.stockNumber,
    jumbo.materialCode,
    materialName(jumbo, materials),
    jumboStatusTitle(jumbo.status),
  ]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

function compare(
  a: Jumbo,
  b: Jumbo,
  key: WarehouseSortKey,
  materials: Map<string, Material>,
): number {
  switch (key) {
    case "arrivalDate":
      return b.arrivalDate.localeCompare(a.arrivalDate);
    case "material":
      return materialName(a, materials).localeCompare(materialName(b, materials));
    case "remainder":
      return b.currentRemainderM - a.currentRemainderM;
    case "stockNumber":
      return a.stockNumber.localeCompare(b.stockNumber, undefined, { numeric: true });
  }
}

/**
 * ViewModel for the warehouse screen. Loads Jumbos plus a material lookup, and
 * derives the searched/filtered/sorted list and per-status counts. All work is
 * in-memory over already-loaded records — no per-render repository queries.
 */
export function useWarehouseViewModel(): WarehouseViewModel {
  const { jumbos: jumboRepository, materials: materialRepository, warehouse, settings } =
    useServices();
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState<Jumbo[]>([]);
  const [materialsById, setMaterialsById] = useState<Map<string, Material>>(new Map());
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<WarehouseFilter>("all");
  const [sortKey, setSortKey] = useState<WarehouseSortKey>("arrivalDate");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [jumboList, materialList] = await Promise.all([
        jumboRepository.getAll(),
        materialRepository.getAll(),
      ]);
      setAll(jumboList);
      setMaterialsById(new Map(materialList.map((material) => [material.id, material])));
    } finally {
      setLoading(false);
    }
  }, [jumboRepository, materialRepository]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const startUsage = useCallback(
    async (jumboId: string) => {
      const current = await settings.load();
      await warehouse.startUsage(jumboId, current.operator || undefined);
      await reload();
    },
    [warehouse, settings, reload],
  );

  const counts = useMemo<Record<WarehouseFilter, number>>(() => {
    const base: Record<WarehouseFilter, number> = {
      all: all.length,
      [JumboStatus.onStock]: 0,
      [JumboStatus.inWork]: 0,
      [JumboStatus.toWriteOff]: 0,
      [JumboStatus.archived]: 0,
    };
    for (const jumbo of all) {
      base[jumbo.status] += 1;
    }
    return base;
  }, [all]);

  const jumbos = useMemo(() => {
    return all
      .filter((jumbo) => filter === "all" || jumbo.status === filter)
      .filter((jumbo) => matches(jumbo, query, materialsById))
      .sort((a, b) => compare(a, b, sortKey, materialsById));
  }, [all, filter, query, sortKey, materialsById]);

  return {
    loading,
    jumbos,
    materialsById,
    query,
    setQuery,
    filter,
    setFilter,
    sortKey,
    setSortKey,
    counts,
    startUsage,
    reload,
  };
}
