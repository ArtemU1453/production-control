import { useEffect } from "react";
import { useServices } from "@/core/di/AppServices";

/**
 * Runs the automatic report scheduler once on app launch. There is no
 * background daemon in a client build, so due monthly reports are generated (and
 * sent when auto-send is on) the first time the app opens in a new period.
 */
export function useDocumentScheduler(): void {
  const { documents } = useServices();
  useEffect(() => {
    void documents.scheduler.checkAndRun().catch(() => undefined);
  }, [documents]);
}
