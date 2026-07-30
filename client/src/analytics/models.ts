import type { IconName } from "@/resources/icons";
import type { Machine } from "@/models";

/** Enterprise production KPI over a period. */
export interface ProductionKpi {
  orders: number;
  rolls: number;
  materialUsedM: number;
  usefulAreaM2: number;
  wasteAreaM2: number;
  scrapAreaM2: number;
  totalLossesM2: number;
  avgUsagePercent: number;
  avgPerOrderM: number;
  avgPerRollM: number;
}

/** Jumbo distribution and averages. */
export interface JumboAnalytics {
  total: number;
  onStock: number;
  inWork: number;
  toWriteOff: number;
  archived: number;
  avgAreaM2: number;
  avgRemainderM: number;
  avgUsagePercent: number;
}

export interface OperatorStat {
  operator: string;
  orders: number;
  rolls: number;
  materialUsedM: number;
  usefulAreaM2: number;
  wasteAreaM2: number;
  wastePercent: number;
}

export interface MachineStat {
  machine: Machine;
  machineTitle: string;
  orders: number;
  rolls: number;
  materialUsedM: number;
  usefulAreaM2: number;
  hours: number;
  /** Производительность — rolls per hour. */
  productivity: number;
}

export interface MaterialStat {
  materialCode: string;
  jumbos: number;
  usedM: number;
  remainderM: number;
  usefulAreaM2: number;
  orders: number;
}

export interface RankingEntry {
  label: string;
  value: number;
  display: string;
}

export interface Ranking {
  key: string;
  title: string;
  entries: RankingEntry[];
}

export interface TrendPoint {
  bucket: string;
  orders: number;
  rolls: number;
  materialUsedM: number;
  usefulAreaM2: number;
}

/** A KPI card model for the UI: value, unit, icon and delta vs previous period. */
export interface KpiCard {
  key: string;
  label: string;
  value: string;
  unit?: string;
  icon: IconName;
  deltaPercent?: number;
}

/** Period comparison kinds. */
export enum ComparisonKind {
  dayOverDay = "dayOverDay",
  monthOverMonth = "monthOverMonth",
  yearOverYear = "yearOverYear",
}

export interface ComparisonMetric {
  key: string;
  label: string;
  current: number;
  previous: number;
  deltaPercent: number;
  unit: string;
}

export interface PeriodComparison {
  kind: ComparisonKind;
  currentLabel: string;
  previousLabel: string;
  metrics: ComparisonMetric[];
}

/** Everything the analytics screen needs, computed from a single data load. */
export interface AnalyticsOverview {
  production: ProductionKpi;
  jumbos: JumboAnalytics;
  operators: OperatorStat[];
  machines: MachineStat[];
  materials: MaterialStat[];
  rankings: Ranking[];
  trend: TrendPoint[];
}
