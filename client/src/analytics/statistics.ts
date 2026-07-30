/**
 * KPI value objects for future analytics screens.
 *
 * These are structure-only: the aggregation logic that fills them lands in a
 * later phase. They are grouped here so the analytics layer has a single,
 * discoverable contract.
 */

/** KPI per material grade. */
export interface MaterialStatistics {
  materialCode: string;
  jumboCount: number;
  totalUsedLengthM: number;
  totalUsefulAreaM2: number;
  totalWasteM2: number;
  utilizationRate: number;
}

/** KPI per cutting machine. */
export interface MachineStatistics {
  machineId: string;
  totalCycles: number;
  totalHours: number;
  rollsProduced: number;
  utilizationRate: number;
}

/** KPI per operator. */
export interface OperatorStatistics {
  operator: string;
  ordersCompleted: number;
  rollsProduced: number;
  avgWastePercent: number;
  totalHours: number;
}

/** Waste breakdown over a period. */
export interface WasteStatistics {
  periodStart: string;
  periodEnd: string;
  edgeWasteM2: number;
  innerWasteM2: number;
  techScrapM2: number;
  totalWasteM2: number;
  wastePercent: number;
}

/** Overall production KPI over a period. */
export interface ProductionStatistics {
  periodStart: string;
  periodEnd: string;
  ordersCompleted: number;
  rollsProduced: number;
  totalUsefulAreaM2: number;
  totalWasteM2: number;
  avgUtilizationRate: number;
}
