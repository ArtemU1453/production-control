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
  createEmailQueue,
  createEmailService,
  createReportBuilder,
  createReportService,
  createWarehouseService,
  type CalculationService,
  type EmailQueue,
  type EmailService,
  type ReportBuilder,
  type ReportService,
  type WarehouseService,
} from "../../services";
import { createReportCenter, type ReportCenter } from "../../reports";
import { createDocumentsCenter, type DocumentsCenter } from "../../documents";
import {
  createAnalyticsService,
  createKpiEngine,
  type AnalyticsService,
} from "../../analytics";

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
  reports: ReportService;
  reportBuilder: ReportBuilder;
  email: EmailService;
  emailQueue: EmailQueue;
  warehouse: WarehouseService;
  /** Report Center: report generation, cache and export/email providers. */
  reportCenter: ReportCenter;
  /** Documents: PDF generation, email delivery, history and scheduling. */
  documents: DocumentsCenter;
  /** Analytics: KPI engine over aggregated data (shared with the Dashboard). */
  analytics: AnalyticsService;
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
    reports: createReportService(),
    reportBuilder: createReportBuilder(),
    email: createEmailService(),
    emailQueue: createEmailQueue(store),
    warehouse: createWarehouseService(
      jumbos,
      jumboOperations,
      cuttingSessions,
      wastes,
      archivedJumbos,
    ),
    reportCenter,
    documents: createDocumentsCenter({
      reports: reportCenter.service,
      settings,
      store,
    }),
    analytics: createAnalyticsService(reportCenter.repository, createKpiEngine()),
  };
}
