import type { ReportData } from "../models/ReportData";

/** Target formats a {@link ReportData} can be exported to. */
export enum ExportFormat {
  pdf = "pdf",
  excel = "excel",
  csv = "csv",
  email = "email",
}

export interface ExportResult {
  format: ExportFormat;
  available: boolean;
  /** Explanation when `available` is false. */
  reason?: string;
  /** Location/identifier of the produced artefact once implemented. */
  fileRef?: string;
}

/**
 * Export contract. The universal {@link ReportData} is the only input, so PDF,
 * Excel and CSV providers are added without touching report generation. This
 * phase defines the architecture only — providers report that export is not yet
 * available rather than producing files.
 */
export interface ExportProvider {
  readonly format: ExportFormat;
  export(report: ReportData): Promise<ExportResult>;
}

/** Email delivery of a report. Defined now; implemented in a later phase. */
export interface EmailReportProvider {
  readonly format: ExportFormat;
  send(report: ReportData, recipient: string): Promise<ExportResult>;
}

/** Routes an export request to the provider registered for a format. */
export interface ReportExporter {
  availableFormats(): ExportFormat[];
  export(format: ExportFormat, report: ReportData): Promise<ExportResult>;
}
