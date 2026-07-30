import type { ReportData } from "../models/ReportData";

/**
 * In-memory cache of generated reports. Keyed by report kind + filter + a data
 * signature, so a cached report is reused only while the underlying data is
 * unchanged; any warehouse write changes the signature and invalidates it.
 */
export interface ReportCache {
  get(key: string): ReportData | undefined;
  set(key: string, data: ReportData): void;
  clear(): void;
}

export function createReportCache(): ReportCache {
  const store = new Map<string, ReportData>();
  return {
    get(key) {
      return store.get(key);
    },
    set(key, data) {
      store.set(key, data);
    },
    clear() {
      store.clear();
    },
  };
}
