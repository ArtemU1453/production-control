import type { ReportData } from "../models/ReportData";
import {
  ExportFormat,
  type EmailReportProvider,
  type ExportProvider,
  type ExportResult,
  type ReportExporter,
} from "./ExportProvider";

const PENDING = "Экспорт будет реализован на следующем этапе.";

function pendingProvider(format: ExportFormat): ExportProvider {
  return {
    format,
    async export() {
      return { format, available: false, reason: PENDING };
    },
  };
}

/** PDF export — architecture only. */
export function createPdfExportProvider(): ExportProvider {
  return pendingProvider(ExportFormat.pdf);
}

/** Excel export — architecture only. */
export function createExcelProvider(): ExportProvider {
  return pendingProvider(ExportFormat.excel);
}

/** CSV export — architecture only. */
export function createCsvProvider(): ExportProvider {
  return pendingProvider(ExportFormat.csv);
}

/** Email delivery of a report — architecture only. */
export function createEmailReportProvider(): EmailReportProvider {
  return {
    format: ExportFormat.email,
    async send() {
      return { format: ExportFormat.email, available: false, reason: PENDING };
    },
  };
}

/** Builds the exporter over the registered format providers. Adding a new
 *  format means registering one provider here — nothing else changes. */
export function createReportExporter(providers: ExportProvider[]): ReportExporter {
  const registry = new Map<ExportFormat, ExportProvider>(
    providers.map((provider) => [provider.format, provider]),
  );
  return {
    availableFormats() {
      return Array.from(registry.keys());
    },
    async export(format: ExportFormat, report: ReportData): Promise<ExportResult> {
      const provider = registry.get(format);
      if (!provider) {
        return { format, available: false, reason: "Формат не поддерживается." };
      }
      return provider.export(report);
    },
  };
}
