import type { KeyValueStore } from "@/storage/KeyValueStore";
import { backupStorageKeys, storageKeys } from "@/storage/StorageKeys";
import { nowIso } from "@/extensions/date";
import { appInfo } from "@/resources/appInfo";
import { AuditAction, BACKUP_VERSION, type BackupData, type BackupMeta } from "../models";
import type { AuditLogService } from "./AuditLogService";

/**
 * Full backup, restore, export and import.
 *
 * A backup captures every persisted collection (Jumbos, orders, sessions,
 * operations, wastes, archives, documents, logs, users, settings) as one JSON
 * snapshot. Restore writes them back; the caller warns the user first and
 * reloads the app afterwards. Every backup/restore is audited.
 */
export interface BackupService {
  createBackup(): Promise<BackupData>;
  restore(backup: BackupData): Promise<void>;
  exportJson(): Promise<string>;
  importJson(json: string): Promise<void>;
  meta(): Promise<BackupMeta>;
}

function isBackupData(value: unknown): value is BackupData {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<BackupData>;
  return typeof candidate.version === "number" && typeof candidate.data === "object" && candidate.data !== null;
}

export function createBackupService(
  store: KeyValueStore,
  audit: AuditLogService,
): BackupService {
  async function readMeta(): Promise<BackupMeta> {
    return (await store.read<BackupMeta>(storageKeys.backupMeta)) ?? {};
  }

  const service: BackupService = {
    async createBackup() {
      const data: Record<string, unknown> = {};
      for (const key of backupStorageKeys) {
        data[key] = (await store.read<unknown>(key)) ?? null;
      }
      const backup: BackupData = {
        version: BACKUP_VERSION,
        appVersion: appInfo.version,
        createdAt: nowIso(),
        data,
      };
      const meta = await readMeta();
      await store.write<BackupMeta>(storageKeys.backupMeta, { ...meta, lastBackupAt: backup.createdAt });
      await audit.record(AuditAction.backup, { details: `Ключей: ${backupStorageKeys.length}` });
      return backup;
    },

    async restore(backup) {
      if (backup.version > BACKUP_VERSION) {
        throw new Error("Версия резервной копии новее поддерживаемой");
      }
      for (const [key, value] of Object.entries(backup.data)) {
        await store.write(key, value);
      }
      const meta = await readMeta();
      await store.write<BackupMeta>(storageKeys.backupMeta, { ...meta, lastRestoreAt: nowIso() });
      await audit.record(AuditAction.restore, { details: `Из копии от ${backup.createdAt}` });
    },

    async exportJson() {
      return JSON.stringify(await service.createBackup(), null, 2);
    },

    async importJson(json) {
      const parsed: unknown = JSON.parse(json);
      if (!isBackupData(parsed)) {
        throw new Error("Некорректный формат резервной копии");
      }
      await service.restore(parsed);
    },

    async meta() {
      return readMeta();
    },
  };

  return service;
}
