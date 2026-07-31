import { useCallback, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import { useToast } from "@/hooks/use-toast";
import type { IntegrityReport } from "../models";

type MaintenanceAction = "integrity" | "relations" | "optimize" | "rebuild" | "cache";

interface MaintenanceViewModel {
  busy: MaintenanceAction | null;
  report: IntegrityReport | null;
  checkIntegrity: () => Promise<void>;
  checkRelations: () => Promise<void>;
  optimize: () => Promise<void>;
  rebuildIndexes: () => Promise<void>;
  clearCache: () => Promise<void>;
}

/** ViewModel for database maintenance. Integrity and relation checks are
 *  read-only and surface an {@link IntegrityReport}; the remaining actions run
 *  through the maintenance service and report their outcome via a toast. */
export function useMaintenanceViewModel(): MaintenanceViewModel {
  const { admin } = useServices();
  const { toast } = useToast();
  const [busy, setBusy] = useState<MaintenanceAction | null>(null);
  const [report, setReport] = useState<IntegrityReport | null>(null);

  const runCheck = useCallback(
    async (action: MaintenanceAction, run: () => Promise<IntegrityReport>) => {
      setBusy(action);
      try {
        const result = await run();
        setReport(result);
        toast({
          title: result.ok ? "Проверка пройдена" : "Обнаружены проблемы",
          description: `Проверено записей: ${result.checked}, замечаний: ${result.issues.length}`,
          variant: result.ok ? undefined : "destructive",
        });
      } finally {
        setBusy(null);
      }
    },
    [toast],
  );

  const runAction = useCallback(
    async (action: MaintenanceAction, run: () => Promise<{ title: string; detail: string }>) => {
      setBusy(action);
      try {
        const result = await run();
        toast({ title: result.title, description: result.detail });
      } finally {
        setBusy(null);
      }
    },
    [toast],
  );

  return {
    busy,
    report,
    checkIntegrity: () => runCheck("integrity", () => admin.maintenance.checkIntegrity()),
    checkRelations: () => runCheck("relations", () => admin.maintenance.checkRelations()),
    optimize: () => runAction("optimize", () => admin.maintenance.optimize()),
    rebuildIndexes: () => runAction("rebuild", () => admin.maintenance.rebuildIndexes()),
    clearCache: () => runAction("cache", () => admin.maintenance.clearCache()),
  };
}
