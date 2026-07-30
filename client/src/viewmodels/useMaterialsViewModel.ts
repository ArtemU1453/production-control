import { useCallback, useEffect, useMemo, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import { MaterialStatus, type Material } from "@/models";

export type MaterialSortKey = "code" | "name" | "createdAt";
export type MaterialStatusFilter = "all" | MaterialStatus;

interface MaterialsViewModel {
  loading: boolean;
  materials: Material[];
  query: string;
  setQuery: (value: string) => void;
  statusFilter: MaterialStatusFilter;
  setStatusFilter: (value: MaterialStatusFilter) => void;
  sortKey: MaterialSortKey;
  setSortKey: (value: MaterialSortKey) => void;
  remove: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

function matches(material: Material, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return [material.code, material.name, material.manufacturer]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

function compare(a: Material, b: Material, key: MaterialSortKey): number {
  switch (key) {
    case "code":
      return a.code.localeCompare(b.code);
    case "name":
      return a.name.localeCompare(b.name);
    case "createdAt":
      return b.createdAt.localeCompare(a.createdAt);
  }
}

/** ViewModel for the materials reference book: search, status filter, sort and
 *  deletion over the material repository. */
export function useMaterialsViewModel(): MaterialsViewModel {
  const { materials: repository } = useServices();
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState<Material[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<MaterialStatusFilter>("all");
  const [sortKey, setSortKey] = useState<MaterialSortKey>("code");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setAll(await repository.getAll());
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const remove = useCallback(
    async (id: string) => {
      await repository.delete(id);
      await reload();
    },
    [repository, reload],
  );

  const materials = useMemo(() => {
    return all
      .filter((material) => statusFilter === "all" || material.status === statusFilter)
      .filter((material) => matches(material, query))
      .sort((a, b) => compare(a, b, sortKey));
  }, [all, statusFilter, query, sortKey]);

  return {
    loading,
    materials,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    sortKey,
    setSortKey,
    remove,
    reload,
  };
}
