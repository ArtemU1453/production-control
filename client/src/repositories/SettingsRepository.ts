import { defaultSettings, setMachineDisplayNames, type AppSettings } from "../models";
import type { KeyValueStore } from "../storage/KeyValueStore";
import { storageKeys } from "../storage/StorageKeys";

/** A single-record repository for application settings. */
export interface SettingsRepository {
  load(): Promise<AppSettings>;
  save(settings: AppSettings): Promise<void>;
}

export function createSettingsRepository(
  store: KeyValueStore,
): SettingsRepository {
  return {
    async load() {
      const stored = await store.read<Partial<AppSettings>>(storageKeys.settings);
      const settings = { ...defaultSettings, ...stored };
      // Keep the global machine-name registry in sync with persisted settings so
      // machineTitle() everywhere reflects the operator's names.
      setMachineDisplayNames(settings.machineNames);
      return settings;
    },
    async save(settings) {
      setMachineDisplayNames(settings.machineNames);
      await store.write(storageKeys.settings, settings);
    },
  };
}
