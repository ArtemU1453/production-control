/** Namespaced keys under which the storage layer persists collections. */
export const storageKeys = {
  cuttingSessions: "narezka.store.cuttingSessions",
  materials: "narezka.store.materials",
  jumbos: "narezka.store.jumbos",
  jumboOperations: "narezka.store.jumboOperations",
  wastes: "narezka.store.wastes",
  archivedJumbos: "narezka.store.archivedJumbos",
  finishedRolls: "narezka.store.finishedRolls",
  documents: "narezka.store.documents",
  documentsMeta: "narezka.store.documentsMeta",
  errorLogs: "narezka.store.errorLogs",
  auditLogs: "narezka.store.auditLogs",
  users: "narezka.store.users",
  backupMeta: "narezka.store.backupMeta",
  notificationStates: "narezka.store.notificationStates",
  settingsHistory: "narezka.store.settingsHistory",
  settings: "narezka.store.settings",
  /** In-progress production workflow for Станок №1, persisted so an active run
   *  survives tab navigation and page reload (cleared on finish / cancel).
   *  Keeps its historical key so machine №1 sessions saved before the two-machine
   *  split are restored unchanged. */
  activeProduction: "narezka.store.activeProduction",
  /** In-progress production workflow for Станок №2 — an independent run stored
   *  under its own key so the two machines never share state. */
  activeProductionMachine2: "narezka.store.activeProduction.machine2",
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
  storageKeys.finishedRolls,
  storageKeys.documents,
  storageKeys.errorLogs,
  storageKeys.auditLogs,
  storageKeys.users,
  storageKeys.notificationStates,
  storageKeys.settingsHistory,
  storageKeys.settings,
];
