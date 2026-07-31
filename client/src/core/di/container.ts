import { LocalStorageStore } from "../../storage/LocalStorageStore";
import type { KeyValueStore } from "../../storage/KeyValueStore";
import {
  createArchivedJumboRepository,
  createCuttingSessionRepository,
  createJumboOperationRepository,
  createJumboRepository,
  createMaterialRepository,
  createSettingsRepository,
  createWasteRepository,
  type ArchivedJumboRepository,
  type CuttingSessionRepository,
  type JumboOperationRepository,
  type JumboRepository,
  type MaterialRepository,
  type SettingsRepository,
  type WasteRepository,
} from "../../repositories";
import {
  createCalculationService,
  createReportBuilder,
  createWarehouseService,
  type CalculationService,
  type ReportBuilder,
  type WarehouseService,
} from "../../services";
import { createReportCenter, type ReportCenter } from "../../reports";
import { createDocumentsCenter, type DocumentsCenter } from "../../documents";
import {
  createAnalyticsService,
  createKpiEngine,
  type AnalyticsService,
} from "../../analytics";
import { createAdminCenter, type AdminCenter } from "../../admin";
import {
  createIntelligenceCenter,
  type IntelligenceCenter,
} from "../../intelligence";
import { appConfig, type AppConfig } from "../../config";
import { logger, type Logger } from "../logging/Logger";
import { createErrorHandler, type ErrorHandler } from "../errors/ErrorHandler";
import { createMonitoring, type Monitoring } from "../monitoring/Monitoring";

/**
 * Application composition root.
 *
 * All services and repositories are constructed here and injected downstream,
 * so no screen or ViewModel news up its own dependencies. Swapping the storage
 * backend (e.g. to SwiftData/IndexedDB/server), or providing test doubles, is a
 * change confined to this file.
 */
export interface AppContainer {
  store: KeyValueStore;
  cuttingSessions: CuttingSessionRepository;
  materials: MaterialRepository;
  jumbos: JumboRepository;
  jumboOperations: JumboOperationRepository;
  wastes: WasteRepository;
  archivedJumbos: ArchivedJumboRepository;
  settings: SettingsRepository;
  calculation: CalculationService;
  reportBuilder: ReportBuilder;
  warehouse: WarehouseService;
  /** Report Center: report generation, cache and export/email providers. */
  reportCenter: ReportCenter;
  /** Documents: PDF generation, email delivery, history and scheduling. */
  documents: DocumentsCenter;
  /** Analytics: KPI engine over aggregated data (shared with the Dashboard). */
  analytics: AnalyticsService;
  /** Administration: logs, users, backup/restore, maintenance, diagnostics. */
  admin: AdminCenter;
  /** Decision support (v2.0): notifications, forecasts, quality, search. */
  intelligence: IntelligenceCenter;
  /** Foundation (v3.0 prep): configuration, logging, monitoring, error handling. */
  config: AppConfig;
  logger: Logger;
  monitoring: Monitoring;
  errorHandler: ErrorHandler;
}

export function createAppContainer(
  store: KeyValueStore = new LocalStorageStore(),
): AppContainer {
  const jumbos = createJumboRepository(store);
  const jumboOperations = createJumboOperationRepository(store);
  const cuttingSessions = createCuttingSessionRepository(store);
  const wastes = createWasteRepository(store);
  const archivedJumbos = createArchivedJumboRepository(store);
  const materials = createMaterialRepository(store);
  const settings = createSettingsRepository(store);
  const reportCenter = createReportCenter({
    materials,
    jumbos,
    archivedJumbos,
    cuttingSessions,
    wastes,
    jumboOperations,
  });
  const documents = createDocumentsCenter({
    reports: reportCenter.service,
    settings,
    store,
  });
  const admin = createAdminCenter(store);
  const monitoring = createMonitoring();
  // Unified error handling: normalise → log (Logger) → persist (error log) →
  // forward to the crash reporter (no-op until a backend is provided).
  const errorHandler = createErrorHandler({
    logger,
    reportSinks: [
      (error) =>
        void admin.errorLog.log(error.message, {
          stack: error.cause instanceof Error ? error.cause.stack : undefined,
          action: error.code,
        }),
      (error) => monitoring.crash.report(error),
    ],
  });
  const intelligence = createIntelligenceCenter({
    reportRepository: reportCenter.repository,
    settings,
    jumbos,
    materials,
    archivedJumbos,
    sessions: cuttingSessions,
    documentsHistory: () => documents.service.history(),
    backupMeta: () => admin.backup.meta(),
    store,
  });
  return {
    store,
    cuttingSessions,
    materials,
    jumbos,
    jumboOperations,
    wastes,
    archivedJumbos,
    settings,
    calculation: createCalculationService(),
    reportBuilder: createReportBuilder(),
    warehouse: createWarehouseService(
      jumbos,
      jumboOperations,
      cuttingSessions,
      wastes,
      archivedJumbos,
      settings,
    ),
    reportCenter,
    documents,
    analytics: createAnalyticsService(reportCenter.repository, createKpiEngine()),
    admin,
    intelligence,
    config: appConfig,
    logger,
    monitoring,
    errorHandler,
  };
}
