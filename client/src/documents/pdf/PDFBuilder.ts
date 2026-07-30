import type { ReportData } from "@/reports";
import { nowIso } from "@/extensions/date";
import type { PdfDocument } from "../models/PdfDocument";
import { renderReportDocument, type PdfTemplateOptions } from "./PdfTemplate";

function byteSize(text: string): number {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(text).length;
  }
  return text.length;
}

/**
 * Universal PDF builder.
 *
 * It consumes only a {@link ReportData} — never the storage layer — and performs
 * no calculations. Any report kind flows through the same template, so every
 * document looks identical. The output is a print-ready document artefact.
 */
export interface PDFBuilder {
  build(report: ReportData, options?: PdfTemplateOptions): PdfDocument;
}

export function createPDFBuilder(): PDFBuilder {
  return {
    build(report, options) {
      const content = renderReportDocument(report, options);
      return {
        title: report.title,
        kind: report.kind,
        periodLabel: report.period.label,
        reportId: report.id,
        mimeType: "text/html",
        content,
        sizeBytes: byteSize(content),
        generatedAt: nowIso(),
      };
    },
  };
}
