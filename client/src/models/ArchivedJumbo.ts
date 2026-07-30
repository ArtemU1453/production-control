import type { Jumbo } from "./Jumbo";
import type { JumboOperation } from "./JumboOperation";

/** Frozen KPI snapshot captured at archive time. */
export interface ArchivedJumboStatistics {
  usedLength: number;
  usefulArea: number;
  wasteArea: number;
  scrapArea: number;
  efficiency: number;
  operationsCount: number;
}

/**
 * A written-off Jumbo moved to the archive.
 *
 * It carries a full, self-contained snapshot so the archive never depends on
 * the live warehouse: the complete Jumbo record, its captured statistics and
 * its operation history. The migration that fills the archive is a later phase;
 * the structure is defined now so that step is purely additive.
 */
export interface ArchivedJumbo {
  id: string;
  /** Full snapshot of the Jumbo at the moment of archiving. */
  jumbo: Jumbo;
  /** Snapshot of the operation journal. */
  operations: JumboOperation[];
  /** Captured KPI values. */
  statistics: ArchivedJumboStatistics;
  archivedAt: string;
  archivedBy?: string;
  reason?: string;
}
