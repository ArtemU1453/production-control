import type {
  ArchivedJumbo,
  CuttingSession,
  Jumbo,
  JumboOperation,
  Material,
  Waste,
} from "@/models";
import type { ReportFilter } from "../models/ReportFilter";

/**
 * Pre-aggregated, already-filtered snapshot handed to builders.
 *
 * The {@link ReportRepository} loads every collection once and applies the
 * cross-cutting filters, so builders receive prepared data and never touch the
 * storage layer or re-query it.
 */
export interface ReportContext {
  filter: ReportFilter;
  /** All materials (unfiltered — used for name lookups). */
  materials: Material[];
  /** Active (non-archived) Jumbos matching the filter. */
  jumbos: Jumbo[];
  /** Archived Jumbos matching the filter. */
  archived: ArchivedJumbo[];
  /** Production sessions matching the filter. */
  sessions: CuttingSession[];
  /** Waste records matching the filter. */
  wastes: Waste[];
  /** Journal operations matching the filter. */
  operations: JumboOperation[];
  /** Lightweight signature of the underlying data for cache validation. */
  signature: string;
}
