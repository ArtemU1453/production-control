import type {
  ArchivedJumboRepository,
  CuttingSessionRepository,
  JumboOperationRepository,
  JumboRepository,
  MaterialRepository,
  WasteRepository,
} from "@/repositories";
import { createReportRepository, type ReportRepository } from "./repositories/ReportRepository";
import { createReportCache } from "./services/ReportCache";
import {
  createReportCenterService,
  type ReportCenterService,
} from "./services/ReportCenterService";
import {
  createCsvProvider,
  createEmailReportProvider,
  createExcelProvider,
  createPdfExportProvider,
  createReportExporter,
} from "./export/providers";
import type { EmailReportProvider, ReportExporter } from "./export/ExportProvider";

export interface ReportCenterRepositories {
  materials: MaterialRepository;
  jumbos: JumboRepository;
  archivedJumbos: ArchivedJumboRepository;
  cuttingSessions: CuttingSessionRepository;
  wastes: WasteRepository;
  jumboOperations: JumboOperationRepository;
}

/** The composed Report Center subsystem. */
export interface ReportCenter {
  service: ReportCenterService;
  exporter: ReportExporter;
  emailProvider: EmailReportProvider;
  repository: ReportRepository;
}

/** Composition root for the Report Center. Wires the aggregation repository,
 *  cache, service, export providers and email provider from the entity
 *  repositories. Called from the application container. */
export function createReportCenter(repos: ReportCenterRepositories): ReportCenter {
  const repository = createReportRepository(
    repos.materials,
    repos.jumbos,
    repos.archivedJumbos,
    repos.cuttingSessions,
    repos.wastes,
    repos.jumboOperations,
  );
  const cache = createReportCache();
  const service = createReportCenterService(repository, cache);
  const exporter = createReportExporter([
    createPdfExportProvider(),
    createExcelProvider(),
    createCsvProvider(),
  ]);
  const emailProvider = createEmailReportProvider();
  return { service, exporter, emailProvider, repository };
}
