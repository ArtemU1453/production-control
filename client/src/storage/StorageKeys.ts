/** Namespaced keys under which the storage layer persists collections. */
export const storageKeys = {
  cuttingOrders: "narezka.store.cuttingOrders",
  materials: "narezka.store.materials",
  jumbos: "narezka.store.jumbos",
  jumboOperations: "narezka.store.jumboOperations",
  archivedJumbos: "narezka.store.archivedJumbos",
  settings: "narezka.store.settings",
} as const;

export type StorageKey = (typeof storageKeys)[keyof typeof storageKeys];
