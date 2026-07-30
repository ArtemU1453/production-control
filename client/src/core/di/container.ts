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
}

export function createAppContainer(
  store: KeyValueStore = new LocalStorageStore(),
): AppContainer {
  const jumbos = createJumboRepository(store);
  const jumboOperations = createJumboOperationRepository(store);
  const cuttingSessions = createCuttingSessionRepository(store);
  const wastes = createWasteRepository(store);
  const archivedJumbos = createArchivedJumboRepository(store);
  return {
    store,
    cuttingSessions,
    materials: createMaterialRepository(store),
    jumbos,
    jumboOperations,
    wastes,
    archivedJumbos,
    settings: createSettingsRepository(store),
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
  };
}
