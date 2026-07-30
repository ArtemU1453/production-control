import {
  JumboStatus,
  type ArchivedJumbo,
  type CuttingSession,
  type Jumbo,
  type JumboOperation,
  type Waste,
} from "@/models";
import type {
  ArchivedJumboRepository,
  CuttingSessionRepository,
  JumboOperationRepository,
  JumboRepository,
  MaterialRepository,
  WasteRepository,
} from "@/repositories";
import type { ReportFilter } from "../models/ReportFilter";
import type { ReportContext } from "./ReportContext";

function dateInRange(iso: string, start?: string, end?: string): boolean {
  const day = iso.slice(0, 10);
  if (start && day < start) {
    return false;
  }
  if (end && day > end) {
    return false;
  }
  return true;
}

function equalsIfSet(value: string | undefined, expected?: string): boolean {
  return !expected || value === expected;
}

function sessionMatches(session: CuttingSession, filter: ReportFilter): boolean {
  return (
    dateInRange(session.createdAt, filter.startDate, filter.endDate) &&
    equalsIfSet(session.materialCode, filter.materialCode) &&
    equalsIfSet(session.order.operator, filter.operator) &&
    equalsIfSet(session.order.machine, filter.machine) &&
    equalsIfSet(session.order.customer, filter.customer) &&
    equalsIfSet(session.order.orderNumber, filter.orderNumber) &&
    equalsIfSet(session.jumboStockNumber, filter.jumboNumber)
  );
}

function jumboMatches(jumbo: Jumbo, filter: ReportFilter): boolean {
  // Archived Jumbos are represented by the ArchivedJumbo snapshot, so they are
  // excluded from the active set to avoid double-counting.
  if (jumbo.status === JumboStatus.archived) {
    return false;
  }
  if (filter.status && filter.status !== jumbo.status) {
    return false;
  }
  return (
    equalsIfSet(jumbo.materialCode, filter.materialCode) &&
    equalsIfSet(jumbo.stockNumber, filter.jumboNumber)
  );
}

function archivedMatches(entry: ArchivedJumbo, filter: ReportFilter): boolean {
  if (filter.status && filter.status !== JumboStatus.archived) {
    return false;
  }
  return (
    dateInRange(entry.archivedAt, filter.startDate, filter.endDate) &&
    equalsIfSet(entry.jumbo.materialCode, filter.materialCode) &&
    equalsIfSet(entry.jumbo.stockNumber, filter.jumboNumber) &&
    equalsIfSet(entry.archivedBy, filter.operator)
  );
}

function wasteMatches(waste: Waste, filter: ReportFilter): boolean {
  return (
    dateInRange(waste.createdAt, filter.startDate, filter.endDate) &&
    equalsIfSet(waste.operator, filter.operator)
  );
}

function operationMatches(operation: JumboOperation, filter: ReportFilter): boolean {
  return (
    dateInRange(operation.timestamp, filter.startDate, filter.endDate) &&
    equalsIfSet(operation.operator, filter.operator) &&
    equalsIfSet(operation.machine, filter.machine) &&
    equalsIfSet(operation.customer, filter.customer) &&
    equalsIfSet(operation.orderNumber, filter.orderNumber)
  );
}

function maxTimestamp(values: string[]): string {
  return values.reduce((max, value) => (value > max ? value : max), "");
}

/**
 * Aggregation gateway for the Report Center.
 *
 * It reads every entity repository once (`Promise.all`), applies the shared
 * filter and returns a {@link ReportContext}. Builders depend only on this
 * prepared data, never on the storage layer — and a data signature is included
 * for cache validation.
 */
export interface ReportRepository {
  loadContext(filter: ReportFilter): Promise<ReportContext>;
}

export function createReportRepository(
  materials: MaterialRepository,
  jumbos: JumboRepository,
  archivedJumbos: ArchivedJumboRepository,
  sessions: CuttingSessionRepository,
  wastes: WasteRepository,
  operations: JumboOperationRepository,
): ReportRepository {
  return {
    async loadContext(filter) {
      const [
        materialList,
        jumboList,
        archivedList,
        sessionList,
        wasteList,
        operationList,
      ] = await Promise.all([
        materials.getAll(),
        jumbos.getAll(),
        archivedJumbos.getAll(),
        sessions.getAll(),
        wastes.getAll(),
        operations.getAll(),
      ]);

      const signature = [
        materialList.length,
        jumboList.length,
        archivedList.length,
        sessionList.length,
        wasteList.length,
        operationList.length,
        maxTimestamp(sessionList.map((s) => s.updatedAt)),
        maxTimestamp(archivedList.map((a) => a.archivedAt)),
        maxTimestamp(operationList.map((o) => o.updatedAt ?? o.timestamp)),
      ].join(":");

      return {
        filter,
        materials: materialList,
        jumbos: jumboList.filter((jumbo) => jumboMatches(jumbo, filter)),
        archived: archivedList.filter((entry) => archivedMatches(entry, filter)),
        sessions: sessionList.filter((session) => sessionMatches(session, filter)),
        wastes: wasteList.filter((waste) => wasteMatches(waste, filter)),
        operations: operationList.filter((operation) => operationMatches(operation, filter)),
        signature,
      };
    },
  };
}
