/** Type of report a user can request. */
export enum ReportType {
  order = "order",
  jumbo = "jumbo",
  production = "production",
}

/** Output format. PDF generation itself arrives in a later phase. */
export enum ReportFormat {
  pdf = "pdf",
}

/** Lifecycle of a report request. */
export enum ReportStatus {
  pending = "pending",
  generated = "generated",
  sent = "sent",
  failed = "failed",
}

/** A report request and its metadata. */
export interface Report {
  id: string;
  title: string;
  type: ReportType;
  format: ReportFormat;
  status: ReportStatus;
  createdAt: string;
  orderId?: string;
  jumboId?: string;
  periodStart?: string;
  periodEnd?: string;
  /** Location/identifier of the produced file once generation is implemented. */
  fileRef?: string;
}
