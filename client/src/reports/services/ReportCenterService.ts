import {
  allReportDefinitions,
  reportFilterKey,
  type ReportData,
  type ReportDefinition,
  type ReportFilter,
  type ReportKind,
} from "../models";
import { getReportBuilder } from "../builders/registry";
import type { ReportRepository } from "../repositories/ReportRepository";
import type { ReportCache } from "./ReportCache";

/**
 * Facade of the Report Center.
 *
 * It exposes the available report definitions and generates a {@link ReportData}
 * for a given kind + filter. Data is loaded once through the
 * {@link ReportRepository}, the matching builder shapes it, and the result is
 * cached by kind + filter + data signature.
 */
export interface ReportCenterService {
  definitions(): readonly ReportDefinition[];
  generate(kind: ReportKind, filter: ReportFilter): Promise<ReportData>;
}

export function createReportCenterService(
  repository: ReportRepository,
  cache: ReportCache,
): ReportCenterService {
  return {
    definitions() {
      return allReportDefinitions;
    },
    async generate(kind, filter) {
      const context = await repository.loadContext(filter);
      const cacheKey = `${kind}|${reportFilterKey(filter)}|${context.signature}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        return cached;
      }
      const builder = getReportBuilder(kind);
      if (!builder) {
        throw new Error(`Не найден построитель отчёта: ${kind}`);
      }
      const data = builder.build(context);
      cache.set(cacheKey, data);
      return data;
    },
  };
}
