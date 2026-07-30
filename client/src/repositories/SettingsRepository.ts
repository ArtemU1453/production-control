import { defaultSettings, type AppSettings } from "../models";
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
      return { ...defaultSettings, ...stored };
    },
    async save(settings) {
      await store.write(storageKeys.settings, settings);
    },
  };
}
