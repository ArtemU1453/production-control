import type { ReportCenterService } from "@/reports";
import type { SettingsRepository } from "@/repositories";
import type { KeyValueStore } from "@/storage/KeyValueStore";
import { createPDFBuilder, type PDFBuilder } from "./pdf/PDFBuilder";
import { createDocumentRepository, type DocumentRepository } from "./history/DocumentRepository";
import { createLocalEmailTransport, type EmailTransport } from "./providers/EmailTransport";
import { createEmailService, type EmailService } from "./email/EmailService";
import { createDocumentService, type DocumentService } from "./services/DocumentService";
import { createDocumentScheduler, type DocumentScheduler } from "./scheduler/DocumentScheduler";

export interface DocumentsCenterDeps {
  reports: ReportCenterService;
  settings: SettingsRepository;
  store: KeyValueStore;
}

/** The composed Documents subsystem: PDF, email, history, scheduling. */
export interface DocumentsCenter {
  service: DocumentService;
  repository: DocumentRepository;
  scheduler: DocumentScheduler;
  pdfBuilder: PDFBuilder;
  emailService: EmailService;
  transport: EmailTransport;
}

/** Composition root for the Documents module. Wires the PDF builder, document
 *  history, email transport/service, document service and scheduler. The email
 *  transport is the seam for real SMTP/API/1С/ERP/SharePoint integrations. */
export function createDocumentsCenter(deps: DocumentsCenterDeps): DocumentsCenter {
  const pdfBuilder = createPDFBuilder();
  const repository = createDocumentRepository(deps.store);
  const transport = createLocalEmailTransport();
  const emailService = createEmailService(transport);
  const service = createDocumentService(
    deps.reports,
    pdfBuilder,
    repository,
    emailService,
    deps.settings,
  );
  const scheduler = createDocumentScheduler(service, deps.settings, deps.store);
  return { service, repository, scheduler, pdfBuilder, emailService, transport };
}
