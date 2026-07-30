/** Namespaced keys under which the storage layer persists collections. */
export const storageKeys = {
  cuttingSessions: "narezka.store.cuttingSessions",
  materials: "narezka.store.materials",
  jumbos: "narezka.store.jumbos",
  jumboOperations: "narezka.store.jumboOperations",
  wastes: "narezka.store.wastes",
  archivedJumbos: "narezka.store.archivedJumbos",
  emailQueue: "narezka.store.emailQueue",
  settings: "narezka.store.settings",
} as const;

export type StorageKey = (typeof storageKeys)[keyof typeof storageKeys];
