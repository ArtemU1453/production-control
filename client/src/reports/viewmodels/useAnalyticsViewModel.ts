import { useMemo, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import type { ReportDefinition } from "../models";

interface AnalyticsViewModel {
  query: string;
  setQuery: (value: string) => void;
  definitions: readonly ReportDefinition[];
}

/** ViewModel for the analytics hub: the searchable list of available reports. */
export function useAnalyticsViewModel(): AnalyticsViewModel {
  const { reportCenter } = useServices();
  const all = reportCenter.service.definitions();
  const [query, setQuery] = useState("");

  const definitions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return all;
    }
    return all.filter((definition) =>
      `${definition.title} ${definition.description}`.toLowerCase().includes(q),
    );
  }, [all, query]);

  return { query, setQuery, definitions };
}
