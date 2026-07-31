/** Namespaced keys under which the storage layer persists collections. */
export const storageKeys = {
  cuttingSessions: "narezka.store.cuttingSessions",
  materials: "narezka.store.materials",
  jumbos: "narezka.store.jumbos",
  jumboOperations: "narezka.store.jumboOperations",
  wastes: "narezka.store.wastes",
  archivedJumbos: "narezka.store.archivedJumbos",
  documents: "narezka.store.documents",
  documentsMeta: "narezka.store.documentsMeta",
  errorLogs: "narezka.store.errorLogs",
  auditLogs: "narezka.store.auditLogs",
  users: "narezka.store.users",
  backupMeta: "narezka.store.backupMeta",
  notificationStates: "narezka.store.notificationStates",
  settingsHistory: "narezka.store.settingsHistory",
  settings: "narezka.store.settings",
} as const;

export type StorageKey = (typeof storageKeys)[keyof typeof storageKeys];

/** Keys whose collections are included in a full backup / diagnostics scan. */
export const backupStorageKeys: readonly StorageKey[] = [
  storageKeys.cuttingSessions,
  storageKeys.materials,
  storageKeys.jumbos,
  storageKeys.jumboOperations,
  storageKeys.wastes,
  storageKeys.archivedJumbos,
  storageKeys.documents,
  storageKeys.errorLogs,
  storageKeys.auditLogs,
  storageKeys.users,
  storageKeys.notificationStates,
  storageKeys.settingsHistory,
  storageKeys.settings,
];
