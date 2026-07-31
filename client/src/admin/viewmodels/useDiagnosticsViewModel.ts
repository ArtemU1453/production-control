import { useCallback, useEffect, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import type { DiagnosticsInfo } from "../models";

interface DiagnosticsViewModel {
  loading: boolean;
  info: DiagnosticsInfo | null;
  sizeLabel: string;
  reload: () => Promise<void>;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} Б`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} КБ`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
}

/** ViewModel for the diagnostics screen: record counts, database size and
 *  version info reported by the DiagnosticsService. */
export function useDiagnosticsViewModel(): DiagnosticsViewModel {
  const { admin } = useServices();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<DiagnosticsInfo | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setInfo(await admin.diagnostics.info());
    } finally {
      setLoading(false);
    }
  }, [admin]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    loading,
    info,
    sizeLabel: info ? formatBytes(info.dbSizeBytes) : "—",
    reload,
  };
}
