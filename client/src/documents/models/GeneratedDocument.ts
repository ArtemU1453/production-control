import type { ReportKind } from "@/reports";

/** Lifecycle status of a generated document. */
export enum DocumentStatus {
  generated = "generated",
  sending = "sending",
  sent = "sent",
  failed = "failed",
}

const statusTitles: Record<DocumentStatus, string> = {
  [DocumentStatus.generated]: "Сформирован",
  [DocumentStatus.sending]: "Отправка…",
  [DocumentStatus.sent]: "Отправлен",
  [DocumentStatus.failed]: "Ошибка",
};

export function documentStatusTitle(status: DocumentStatus): string {
  return statusTitles[status];
}

/**
 * A generated document plus its delivery history.
 *
 * The rendered content is stored on the record, so re-sending never regenerates
 * the document — the saved artefact is reused. History is a list of these.
 */
export interface GeneratedDocument {
  id: string;
  title: string;
  kind: ReportKind;
  createdAt: string;
  periodLabel: string;
  /** Delivery recipients (primary To addresses). */
  recipients: string[];
  cc: string[];
  bcc: string[];
  /** Byte size of the rendered document. */
  sizeBytes: number;
  status: DocumentStatus;
  /** Error text when the last delivery failed. */
  error?: string;
  /** MIME type of the stored content. */
  mimeType: string;
  /** The rendered, print-ready document content. */
  content: string;
  /** Id of the source ReportData. */
  reportId: string;
  /** Whether this document was produced by the automatic scheduler. */
  automatic: boolean;
  /** Last delivery attempt timestamp. */
  sentAt?: string;
}
