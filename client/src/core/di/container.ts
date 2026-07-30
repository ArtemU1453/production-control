import { LocalStorageStore } from "../../storage/LocalStorageStore";
import type { KeyValueStore } from "../../storage/KeyValueStore";
import {
  createArchivedJumboRepository,
  createCuttingOrderRepository,
  createJumboOperationRepository,
  createJumboRepository,
  createMaterialRepository,
  createSettingsRepository,
  type ArchivedJumboRepository,
  type CuttingOrderRepository,
  type JumboOperationRepository,
  type JumboRepository,
  type MaterialRepository,
  type SettingsRepository,
} from "../../repositories";
import {
  createCalculationService,
  createEmailService,
  createReportService,
  createWarehouseService,
  type CalculationService,
  type EmailService,
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
  cuttingOrders: CuttingOrderRepository;
  materials: MaterialRepository;
  jumbos: JumboRepository;
  jumboOperations: JumboOperationRepository;
  archivedJumbos: ArchivedJumboRepository;
  settings: SettingsRepository;
  calculation: CalculationService;
  reports: ReportService;
  email: EmailService;
  warehouse: WarehouseService;
}

export function createAppContainer(
  store: KeyValueStore = new LocalStorageStore(),
): AppContainer {
  const jumbos = createJumboRepository(store);
  const jumboOperations = createJumboOperationRepository(store);
  return {
    store,
    cuttingOrders: createCuttingOrderRepository(store),
    materials: createMaterialRepository(store),
    jumbos,
    jumboOperations,
    archivedJumbos: createArchivedJumboRepository(store),
    settings: createSettingsRepository(store),
    calculation: createCalculationService(),
    reports: createReportService(),
    email: createEmailService(),
    warehouse: createWarehouseService(jumbos, jumboOperations),
  };
}
