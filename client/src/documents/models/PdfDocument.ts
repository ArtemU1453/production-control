import type { ReportKind } from "@/reports";

/**
 * The rendered document artefact produced by the {@link PDFBuilder} from a
 * ReportData. In this web build the content is a self-contained, print-ready
 * HTML document (the browser saves it as PDF); a native PDF-bytes renderer is a
 * drop-in provider that produces the same shape.
 */
export interface PdfDocument {
  title: string;
  kind: ReportKind;
  periodLabel: string;
  reportId: string;
  mimeType: string;
  content: string;
  sizeBytes: number;
  generatedAt: string;
}
