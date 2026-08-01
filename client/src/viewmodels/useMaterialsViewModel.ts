import { useCallback, useEffect, useMemo, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import { MaterialStatus, type Material } from "@/models";
import { makeId } from "@/utilities/id";
import { sanitizeIdentifier, IDENTIFIER_MAX_LENGTH } from "@shared/identifier";

export type MaterialSortKey = "code" | "name" | "createdAt" | "manufacturer";
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
  /** Creates a copy of a material with a fresh unique code, via the existing
   *  repository. Returns the new material's id. */
  duplicate: (material: Material) => Promise<string>;
  reload: () => Promise<void>;
}

/** Derives a unique, valid (≤10 alnum) code for a duplicated material. */
function uniqueCode(base: string, taken: Set<string>): string {
  const clean = sanitizeIdentifier(base) || "M";
  if (!taken.has(clean.toLowerCase())) {
    return clean;
  }
  for (let i = 1; i < 10000; i++) {
    const suffix = String(i);
    const head = clean.slice(0, Math.max(1, IDENTIFIER_MAX_LENGTH - suffix.length));
    const candidate = `${head}${suffix}`;
    if (!taken.has(candidate.toLowerCase())) {
      return candidate;
    }
  }
  return makeId().replace(/[^A-Za-z0-9]/g, "").slice(0, IDENTIFIER_MAX_LENGTH);
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
    case "manufacturer":
      return (a.manufacturer || "").localeCompare(b.manufacturer || "") || a.code.localeCompare(b.code);
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

  const duplicate = useCallback(
    async (material: Material): Promise<string> => {
      const taken = new Set(all.map((item) => item.code.toLowerCase()));
      const now = new Date().toISOString();
      const copy: Material = {
        ...material,
        id: makeId(),
        code: uniqueCode(material.code, taken),
        createdAt: now,
      };
      await repository.save(copy);
      await reload();
      return copy.id;
    },
    [all, repository, reload],
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
    duplicate,
    reload,
  };
}
