import { useEffect, useMemo, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import type { ArchivedJumbo } from "@/models";

export type ArchiveMaterialFilter = "all" | string;
export type ArchiveYearFilter = "all" | string;
export type ArchiveMonthFilter = "all" | string;

interface ArchiveViewModel {
  loading: boolean;
  archived: ArchivedJumbo[];
  query: string;
  setQuery: (value: string) => void;
  materialFilter: ArchiveMaterialFilter;
  setMaterialFilter: (value: ArchiveMaterialFilter) => void;
  yearFilter: ArchiveYearFilter;
  setYearFilter: (value: ArchiveYearFilter) => void;
  monthFilter: ArchiveMonthFilter;
  setMonthFilter: (value: ArchiveMonthFilter) => void;
  materialOptions: string[];
  yearOptions: string[];
}

const MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

function matches(entry: ArchivedJumbo, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return [
    entry.jumbo.stockNumber,
    entry.jumbo.materialCode,
    entry.archivedBy ?? "",
    entry.usageStartDate ?? "",
    entry.usageEndDate ?? "",
    entry.archivedAt,
  ]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

/**
 * ViewModel for the archive section. Reads frozen {@link ArchivedJumbo} records
 * and applies in-memory search and material / month / year filters — the
 * archive itself is never recalculated.
 */
export function useArchiveViewModel(): ArchiveViewModel {
  const { archivedJumbos } = useServices();
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState<ArchivedJumbo[]>([]);
  const [query, setQuery] = useState("");
  const [materialFilter, setMaterialFilter] = useState<ArchiveMaterialFilter>("all");
  const [yearFilter, setYearFilter] = useState<ArchiveYearFilter>("all");
  const [monthFilter, setMonthFilter] = useState<ArchiveMonthFilter>("all");

  useEffect(() => {
    let active = true;
    void (async () => {
      const items = await archivedJumbos.getAll();
      if (active) {
        setAll(items);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [archivedJumbos]);

  const materialOptions = useMemo(
    () => Array.from(new Set(all.map((entry) => entry.jumbo.materialCode))).sort(),
    [all],
  );
  const yearOptions = useMemo(
    () => Array.from(new Set(all.map((entry) => entry.archivedAt.slice(0, 4)))).sort().reverse(),
    [all],
  );

  const archived = useMemo(() => {
    return all
      .filter((entry) => materialFilter === "all" || entry.jumbo.materialCode === materialFilter)
      .filter((entry) => yearFilter === "all" || entry.archivedAt.slice(0, 4) === yearFilter)
      .filter((entry) => monthFilter === "all" || entry.archivedAt.slice(5, 7) === monthFilter)
      .filter((entry) => matches(entry, query))
      .sort((a, b) => b.archivedAt.localeCompare(a.archivedAt));
  }, [all, materialFilter, yearFilter, monthFilter, query]);

  return {
    loading,
    archived,
    query,
    setQuery,
    materialFilter,
    setMaterialFilter,
    yearFilter,
    setYearFilter,
    monthFilter,
    setMonthFilter,
    materialOptions,
    yearOptions,
  };
}

export const ARCHIVE_MONTHS = MONTHS;
