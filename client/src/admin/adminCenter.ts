import type { KeyValueStore } from "@/storage/KeyValueStore";
import {
  createAuditLogRepository,
  createErrorLogRepository,
  createUserRepository,
} from "./repositories/AdminRepositories";
import {
  createAuditLogService,
  type AuditLogService,
} from "./services/AuditLogService";
import {
  createBackupService,
  type BackupService,
} from "./services/BackupService";
import {
  createDiagnosticsService,
  type DiagnosticsService,
} from "./services/DiagnosticsService";
import {
  createErrorLogService,
  type ErrorLogService,
} from "./services/ErrorLogService";
import {
  createMaintenanceService,
  type MaintenanceService,
} from "./services/MaintenanceService";
import {
  createUserService,
  type UserService,
} from "./services/UserService";
import {
  cloudStorageProvider,
  localStorageProvider,
  type StorageProviderInfo,
} from "./storage/StorageProvider";
import {
  createCsvExportProvider,
  createExcelExportProvider,
  createImportProviders,
  createJsonExportProvider,
  type DataExportProvider,
  type DataImportProvider,
} from "./export/DataExport";

/**
 * Administration center.
 *
 * Groups every admin capability behind one composition root: error and audit
 * logs, user management, backup/restore, database maintenance, diagnostics,
 * pluggable export/import providers and the storage-provider registry. Wired
 * once in the app container and injected downstream so no screen constructs its
 * own admin services.
 */
export interface AdminCenter {
  errorLog: ErrorLogService;
  audit: AuditLogService;
  users: UserService;
  backup: BackupService;
  maintenance: MaintenanceService;
  diagnostics: DiagnosticsService;
  /** Data export providers keyed by format (JSON active, others staged). */
  exportProviders: DataExportProvider[];
  /** Data import providers (staged for a later phase). */
  importProviders: DataImportProvider[];
  /** Storage backends: local device (active) and cloud (staged). */
  storageProviders: StorageProviderInfo[];
}

export function createAdminCenter(store: KeyValueStore): AdminCenter {
  const audit = createAuditLogService(createAuditLogRepository(store));
  const errorLog = createErrorLogService(createErrorLogRepository(store));
  const users = createUserService(createUserRepository(store));
  const backup = createBackupService(store, audit);
  const maintenance = createMaintenanceService(store, audit);
  const diagnostics = createDiagnosticsService(store);

  return {
    errorLog,
    audit,
    users,
    backup,
    maintenance,
    diagnostics,
    exportProviders: [
      createJsonExportProvider(),
      createCsvExportProvider(),
      createExcelExportProvider(),
    ],
    importProviders: createImportProviders(),
    storageProviders: [localStorageProvider(store), cloudStorageProvider()],
  };
}
