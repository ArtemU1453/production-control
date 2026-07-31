/** Backup format version — bumped when the snapshot schema changes. */
export const BACKUP_VERSION = 1;

/**
 * A full data snapshot. `data` maps each storage key to its stored value, so a
 * backup captures all Jumbos, orders, sessions, operations, wastes, archives,
 * documents, logs, users and settings.
 */
export interface BackupData {
  version: number;
  appVersion: string;
  createdAt: string;
  data: Record<string, unknown>;
}

export interface BackupMeta {
  lastBackupAt?: string;
  lastRestoreAt?: string;
}
