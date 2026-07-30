/** Namespaced keys under which the storage layer persists collections. */
export const storageKeys = {
  cuttingOrders: "narezka.store.cuttingOrders",
  jumbos: "narezka.store.jumbos",
  settings: "narezka.store.settings",
} as const;

export type StorageKey = (typeof storageKeys)[keyof typeof storageKeys];
