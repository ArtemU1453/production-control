import { LocalStorageStore } from "../../storage/LocalStorageStore";
import type { KeyValueStore } from "../../storage/KeyValueStore";
import {
  createCuttingOrderRepository,
  createJumboRepository,
  createSettingsRepository,
  type CuttingOrderRepository,
  type JumboRepository,
  type SettingsRepository,
} from "../../repositories";
import {
  createCalculationService,
  createEmailService,
  createReportService,
  type CalculationService,
  type EmailService,
  type ReportService,
} from "../../services";

/**
 * Application composition root.
 *
 * All services and repositories are constructed here and injected downstream,
 * so no screen or ViewModel news up its own dependencies. Swapping the storage
 * backend, or providing test doubles, is a change confined to this file.
 */
export interface AppContainer {
  store: KeyValueStore;
  cuttingOrders: CuttingOrderRepository;
  jumbos: JumboRepository;
  settings: SettingsRepository;
  calculation: CalculationService;
  reports: ReportService;
  email: EmailService;
}

export function createAppContainer(store: KeyValueStore = new LocalStorageStore()): AppContainer {
  return {
    store,
    cuttingOrders: createCuttingOrderRepository(store),
    jumbos: createJumboRepository(store),
    settings: createSettingsRepository(store),
    calculation: createCalculationService(),
    reports: createReportService(),
    email: createEmailService(),
  };
}
