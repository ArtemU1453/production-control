import type { ReportCenterService, ReportFilter, ReportKind } from "@/reports";
import type { SettingsRepository } from "@/repositories";
import { nowIso } from "@/extensions/date";
import { makeId } from "@/utilities/id";
import {
  DocumentStatus,
  type GeneratedDocument,
  type PdfDocument,
} from "../models";
import type { EmailEnvelope } from "../models/Email";
import type { PDFBuilder } from "../pdf/PDFBuilder";
import type { DocumentRepository } from "../history/DocumentRepository";
import type { EmailService } from "../email/EmailService";
import { buildEmailContent, monthLabel } from "../email/EmailTemplate";

export interface DocumentRequest {
  kind: ReportKind;
  filter: ReportFilter;
  recipients: string[];
  cc?: string[];
  bcc?: string[];
  automatic?: boolean;
}

/**
 * Orchestrates document generation and delivery.
 *
 * PDFs are built only from ReportData (via the Report Center + PDFBuilder); the
 * service performs no aggregation itself. Generated documents are stored so a
 * re-send reuses the saved artefact without regenerating it. Delivery failures
 * are recorded with their error text and can be retried.
 */
export interface DocumentService {
  /** Builds a document for preview without storing it. */
  preview(kind: ReportKind, filter: ReportFilter): Promise<PdfDocument>;
  generateAndStore(request: DocumentRequest): Promise<GeneratedDocument>;
  send(documentId: string): Promise<GeneratedDocument>;
  generateAndSend(request: DocumentRequest): Promise<GeneratedDocument>;
  resend(documentId: string): Promise<GeneratedDocument>;
  history(): Promise<GeneratedDocument[]>;
  get(documentId: string): Promise<GeneratedDocument | undefined>;
}

export function createDocumentService(
  reports: ReportCenterService,
  pdfBuilder: PDFBuilder,
  documents: DocumentRepository,
  email: EmailService,
  settings: SettingsRepository,
): DocumentService {
  async function build(kind: ReportKind, filter: ReportFilter): Promise<PdfDocument> {
    const report = await reports.generate(kind, filter);
    const current = await settings.load();
    return pdfBuilder.build(report, { companyName: current.companyName });
  }

  async function deliver(document: GeneratedDocument): Promise<GeneratedDocument> {
    const current = await settings.load();
    const content = buildEmailContent(monthLabel(document.createdAt), current);
    const envelope: EmailEnvelope = {
      to: document.recipients,
      cc: document.cc,
      bcc: document.bcc,
      subject: content.subject,
      body: content.body,
      attachment: {
        filename: `${document.title}.html`,
        mimeType: document.mimeType,
        content: document.content,
        sizeBytes: document.sizeBytes,
      },
    };

    await documents.save({ ...document, status: DocumentStatus.sending });
    const result = await email.send(envelope);
    const updated: GeneratedDocument = result.delivered
      ? { ...document, status: DocumentStatus.sent, sentAt: nowIso(), error: undefined }
      : { ...document, status: DocumentStatus.failed, error: result.detail };
    await documents.save(updated);
    return updated;
  }

  return {
    async preview(kind, filter) {
      return build(kind, filter);
    },

    async generateAndStore(request) {
      const pdf = await build(request.kind, request.filter);
      const document: GeneratedDocument = {
        id: makeId(),
        title: pdf.title,
        kind: request.kind,
        createdAt: nowIso(),
        periodLabel: pdf.periodLabel,
        recipients: request.recipients,
        cc: request.cc ?? [],
        bcc: request.bcc ?? [],
        sizeBytes: pdf.sizeBytes,
        status: DocumentStatus.generated,
        mimeType: pdf.mimeType,
        content: pdf.content,
        reportId: pdf.reportId,
        automatic: request.automatic ?? false,
      };
      await documents.save(document);
      return document;
    },

    async send(documentId) {
      const document = await documents.getById(documentId);
      if (!document) {
        throw new Error("Документ не найден");
      }
      return deliver(document);
    },

    async generateAndSend(request) {
      const document = await this.generateAndStore(request);
      return deliver(document);
    },

    async resend(documentId) {
      return this.send(documentId);
    },

    async history() {
      return documents.recent();
    },

    async get(documentId) {
      return documents.getById(documentId);
    },
  };
}
