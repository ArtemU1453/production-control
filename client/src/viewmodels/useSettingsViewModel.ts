import { useCallback, useEffect, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import { useTheme } from "@/core/theme/ThemeManager";
import { appInfo } from "@/resources/appInfo";
import { defaultSettings, type AppSettings } from "@/models";

interface SettingsViewModel {
  loading: boolean;
  settings: AppSettings;
  isDark: boolean;
  appVersion: string;
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  setDark: (dark: boolean) => void;
}

/**
 * ViewModel for the settings screen. Settings are persisted through the
 * settings repository (the app-storage layer), while appearance flows through
 * the ThemeManager so the toggle stays in sync everywhere.
 */
export function useSettingsViewModel(): SettingsViewModel {
  const { settings: repository, intelligence } = useServices();
  const { isDark, setDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  useEffect(() => {
    let active = true;
    void (async () => {
      const loaded = await repository.load();
      if (active) {
        setSettings(loaded);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [repository]);

  const update = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettings((previous) => {
        if (previous[key] === value) {
          return previous;
        }
        const next = { ...previous, [key]: value };
        void repository.save(next);
        // Record the change (who/what/when/old→new) additively.
        void intelligence.settingsHistory.record(previous, next, previous.operator || undefined);
        return next;
      });
    },
    [repository, intelligence],
  );

  return {
    loading,
    settings,
    isDark,
    appVersion: appInfo.version,
    update,
    setDark,
  };
}
