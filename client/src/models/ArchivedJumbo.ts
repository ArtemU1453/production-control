import type { CuttingSession } from "./CuttingSession";
import type { Jumbo } from "./Jumbo";
import type { JumboOperation } from "./JumboOperation";
import type { Waste } from "./Waste";

/**
 * Frozen final statistics captured once at archive time. These are computed and
 * stored on close; the archive is never recalculated afterwards.
 */
export interface ArchivedJumboStatistics {
  /** Общая площадь Джамба, м² (начальная намотка × ширина). */
  totalAreaM2: number;
  /** Полезная площадь, м². */
  usefulAreaM2: number;
  /** Площадь брака, м². */
  wasteAreaM2: number;
  /** Площадь технологического остатка, м². */
  scrapAreaM2: number;
  /** Общие потери, м² (брак + технологический остаток). */
  totalLossesM2: number;

  /** Процент полезного использования. */
  usefulPercent: number;
  /** Процент брака. */
  wastePercent: number;
  /** Процент технологических потерь. */
  scrapPercent: number;

  usedLengthM: number;
  initialWindingM: number;
  finalRemainderM: number;
  ordersCount: number;
  rollsCount: number;
  operationsCount: number;
  efficiency: number;
}

/**
 * A written-off Jumbo moved to the archive.
 *
 * It carries a full, self-contained snapshot so the archive never depends on
 * the live warehouse: the final Jumbo record, its captured statistics, the
 * operation journal, the production sessions and the waste history. Everything
 * is frozen at close time and never recomputed.
 */
export interface ArchivedJumbo {
  id: string;
  /** Final snapshot of the Jumbo at the moment of archiving. */
  jumbo: Jumbo;
  operations: JumboOperation[];
  sessions: CuttingSession[];
  wastes: Waste[];
  statistics: ArchivedJumboStatistics;
  usageStartDate?: string;
  usageEndDate?: string;
  archivedAt: string;
  archivedBy?: string;
  comment?: string;
}
