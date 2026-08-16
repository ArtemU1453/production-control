import { useCallback, useEffect, useMemo, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import type { ArchivedJumbo } from "@/models";

export type ArchiveMaterialFilter = "all" | string;
export type ArchiveYearFilter = "all" | string;
export type ArchiveMonthFilter = "all" | string;

/** Fallback confirmation phrase used to clear the archive when no PIN is set. */
export const ARCHIVE_CLEAR_PHRASE = "УДАЛИТЬ";

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
  /** True when a Settings PIN is configured (used as the delete password). */
  pinConfigured: boolean;
  /**
   * Verifies the password entered to clear the archive. When a Settings PIN is
   * configured it must match; otherwise the fixed confirmation phrase «УДАЛИТЬ»
   * is required. Never exposes the stored PIN to the UI.
   */
  verifyClearPassword: (input: string) => boolean;
  /** Deletes ALL archived Jumbos — and nothing else — then reloads the list. */
  clearArchive: () => Promise<void>;
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
  const { archivedJumbos, settings } = useServices();
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState<ArchivedJumbo[]>([]);
  const [pin, setPin] = useState("");
  const [query, setQuery] = useState("");
  const [materialFilter, setMaterialFilter] = useState<ArchiveMaterialFilter>("all");
  const [yearFilter, setYearFilter] = useState<ArchiveYearFilter>("all");
  const [monthFilter, setMonthFilter] = useState<ArchiveMonthFilter>("all");

  useEffect(() => {
    let active = true;
    void (async () => {
      const [items, loadedSettings] = await Promise.all([archivedJumbos.getAll(), settings.load()]);
      if (active) {
        setAll(items);
        setPin(loadedSettings.pinEnabled ? loadedSettings.pin.trim() : "");
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [archivedJumbos, settings]);

  const pinConfigured = pin.length > 0;

  const verifyClearPassword = useCallback(
    (input: string): boolean => {
      const value = input.trim();
      if (value.length === 0) {
        return false;
      }
      return pinConfigured ? value === pin : value === ARCHIVE_CLEAR_PHRASE;
    },
    [pin, pinConfigured],
  );

  const clearArchive = useCallback(async () => {
    await archivedJumbos.clear();
    setAll([]);
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
    pinConfigured,
    verifyClearPassword,
    clearArchive,
  };
}

export const ARCHIVE_MONTHS = MONTHS;
