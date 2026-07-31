import type { KeyValueStore } from "@/storage/KeyValueStore";
import { storageKeys } from "@/storage/StorageKeys";
import { appInfo } from "@/resources/appInfo";
import type { DiagnosticsInfo, RecordCounts } from "../models";

/** Database schema version. Bumped when a migration is introduced. */
export const DB_VERSION = 1;

/** Reports the app's technical state: versions, record counts and sizes. */
export interface DiagnosticsService {
  info(): Promise<DiagnosticsInfo>;
}

function byteSize(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }
  const json = JSON.stringify(value);
  return typeof TextEncoder !== "undefined" ? new TextEncoder().encode(json).length : json.length;
}

export function createDiagnosticsService(store: KeyValueStore): DiagnosticsService {
  async function count(key: string): Promise<number> {
    const value = await store.read<unknown[]>(key);
    return Array.isArray(value) ? value.length : 0;
  }

  return {
    async info() {
      const counts: RecordCounts = {
        materials: await count(storageKeys.materials),
        jumbos: await count(storageKeys.jumbos),
        sessions: await count(storageKeys.cuttingSessions),
        operations: await count(storageKeys.jumboOperations),
        wastes: await count(storageKeys.wastes),
        archived: await count(storageKeys.archivedJumbos),
        documents: await count(storageKeys.documents),
        users: await count(storageKeys.users),
        errors: await count(storageKeys.errorLogs),
        audit: await count(storageKeys.auditLogs),
      };

      let dbSizeBytes = 0;
      for (const key of Object.values(storageKeys)) {
        dbSizeBytes += byteSize(await store.read<unknown>(key));
      }

      const totalRecords = Object.values(counts).reduce((s, v) => s + v, 0);

      return {
        appVersion: appInfo.version,
        dbVersion: DB_VERSION,
        counts,
        totalRecords,
        dbSizeBytes,
        archivesCount: counts.archived,
        reportsCount: counts.documents,
        errorsCount: counts.errors,
      };
    },
  };
}
