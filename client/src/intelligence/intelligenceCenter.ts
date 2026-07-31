import type { ReportRepository } from "@/reports";
import type { KeyValueStore } from "@/storage/KeyValueStore";
import type {
  ArchivedJumboRepository,
  CuttingSessionRepository,
  JumboRepository,
  MaterialRepository,
  SettingsRepository,
} from "@/repositories";
import type { GeneratedDocument } from "@/documents/models";
import type { BackupMeta } from "@/admin";
import {
  createIntelligenceService,
  type IntelligenceService,
} from "./services/IntelligenceService";
import { createSearchService, type SearchService } from "./services/SearchService";
import {
  createSettingsHistoryService,
  type SettingsHistoryService,
} from "./services/SettingsHistoryService";
import {
  createIntegrationProviders,
  type IntegrationProvider,
} from "./integrations/IntegrationProvider";

/**
 * Decision-support center (v2.0).
 *
 * Bundles the intelligence facade (notifications / forecast / quality /
 * recommendations), global search, the settings-change history and the staged
 * integration providers behind one composition root. Every capability is built
 * on the existing aggregation gateway and repositories — no new data sources.
 */
export interface IntelligenceCenter {
  intelligence: IntelligenceService;
  search: SearchService;
  settingsHistory: SettingsHistoryService;
  integrations: IntegrationProvider[];
}

export interface IntelligenceCenterDeps {
  reportRepository: ReportRepository;
  settings: SettingsRepository;
  jumbos: JumboRepository;
  materials: MaterialRepository;
  archivedJumbos: ArchivedJumboRepository;
  sessions: CuttingSessionRepository;
  documentsHistory: () => Promise<GeneratedDocument[]>;
  backupMeta: () => Promise<BackupMeta>;
  store: KeyValueStore;
}

export function createIntelligenceCenter(deps: IntelligenceCenterDeps): IntelligenceCenter {
  return {
    intelligence: createIntelligenceService({
      reportRepository: deps.reportRepository,
      settings: deps.settings,
      documentsHistory: deps.documentsHistory,
      backupMeta: deps.backupMeta,
      store: deps.store,
    }),
    search: createSearchService({
      jumbos: deps.jumbos,
      materials: deps.materials,
      archivedJumbos: deps.archivedJumbos,
      sessions: deps.sessions,
      documentsHistory: deps.documentsHistory,
    }),
    settingsHistory: createSettingsHistoryService(deps.store),
    integrations: createIntegrationProviders(),
  };
}
