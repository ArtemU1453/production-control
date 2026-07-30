import {
  ReportFormat,
  ReportStatus,
  ReportType,
  type CuttingOrder,
  type Report,
} from "../models";
import { nowIso } from "../extensions/date";
import { makeId } from "../utilities/id";

export interface ProductionReportRequest {
  periodStart: string;
  periodEnd: string;
  title?: string;
}

/**
 * Report generation contract. The interface is the deliverable for this phase;
 * PDF rendering lands later. Implementations record a report request and return
 * it in a `pending` state — no output file is produced yet.
 */
export interface ReportService {
  generateOrderReport(order: CuttingOrder): Promise<Report>;
  generateProductionReport(request: ProductionReportRequest): Promise<Report>;
}

/** Default implementation: records the request without rendering a file. */
export function createReportService(): ReportService {
  return {
    async generateOrderReport(order) {
      return {
        id: makeId(),
        title: `Отчёт по заказу от ${order.createdAt}`,
        type: ReportType.order,
        format: ReportFormat.pdf,
        status: ReportStatus.pending,
        createdAt: nowIso(),
        orderId: order.id,
      };
    },
    async generateProductionReport(request) {
      return {
        id: makeId(),
        title: request.title ?? "Производственный отчёт",
        type: ReportType.production,
        format: ReportFormat.pdf,
        status: ReportStatus.pending,
        createdAt: nowIso(),
        periodStart: request.periodStart,
        periodEnd: request.periodEnd,
      };
    },
  };
}
