import type { KeyValueStore } from "@/storage/KeyValueStore";

/**
 * Storage provider protocol.
 *
 * The whole app already persists through {@link KeyValueStore}, so that IS the
 * provider protocol. Cloud backends (iCloud, CloudKit, Firebase or a custom
 * server) plug in by implementing this interface — the business logic never
 * changes.
 */
export type StorageProvider = KeyValueStore;

export interface StorageProviderInfo {
  id: string;
  title: string;
  available: boolean;
  provider?: StorageProvider;
  detail?: string;
}

/** Local device storage — the active provider. */
export function localStorageProvider(store: StorageProvider): StorageProviderInfo {
  return {
    id: "local",
    title: "Локальное хранилище",
    available: true,
    provider: store,
    detail: "Данные хранятся на устройстве.",
  };
}

/**
 * Cloud storage — architecture stub. Not implemented in this phase; a future
 * provider (iCloud/CloudKit/Firebase/собственный сервер) fills `provider`.
 */
export function cloudStorageProvider(): StorageProviderInfo {
  return {
    id: "cloud",
    title: "Облачное хранилище",
    available: false,
    detail: "Синхронизация появится в будущих версиях.",
  };
}
