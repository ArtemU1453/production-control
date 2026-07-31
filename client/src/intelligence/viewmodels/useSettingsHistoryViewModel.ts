import { useEffect, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import type { SettingsChangeEntry } from "../models";

interface SettingsHistoryViewModel {
  loading: boolean;
  entries: SettingsChangeEntry[];
}

/** ViewModel for the settings-change history screen. */
export function useSettingsHistoryViewModel(): SettingsHistoryViewModel {
  const { intelligence } = useServices();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<SettingsChangeEntry[]>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const list = await intelligence.settingsHistory.list();
      if (active) {
        setEntries(list);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [intelligence]);

  return { loading, entries };
}
