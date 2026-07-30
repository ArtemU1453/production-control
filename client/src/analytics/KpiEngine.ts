import {
  JumboStatus,
  Machine,
  WasteKind,
  machineTitle,
  wasteKindTitle,
} from "@/models";
import {
  ReportGrouping,
  bucketLabel,
  jumboLines,
  type JumboLine,
  type ReportContext,
} from "@/reports";
import type {
  AnalyticsOverview,
  JumboAnalytics,
  MachineStat,
  MaterialStat,
  OperatorStat,
  ProductionKpi,
  Ranking,
  RankingEntry,
  TrendPoint,
} from "./models";

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((s, v) => s + v, 0) / values.length;
}

/**
 * Pure KPI engine.
 *
 * Every metric is derived from a pre-loaded {@link ReportContext} using the
 * stored, incrementally-maintained accumulators and frozen archive statistics —
 * no storage access and no re-computation of history. It is the single source of
 * production analytics, shared by the analytics screen and the Dashboard.
 *
 * Formulas:
 *  - materialUsedM  = Σ session.result.used_length_m
 *  - usefulAreaM2   = Σ session.result.useful_area_m2
 *  - processedArea  = Σ (materialWidthMm/1000 × used_length_m)
 *  - avgUsagePercent= usefulArea / processedArea × 100
 *  - waste/scrap    = Σ frozen archive statistics over the period
 *  - avgPerOrder    = materialUsedM / orders;  avgPerRoll = materialUsedM / rolls
 *  - productivity   = rolls / hours (per machine)
 */
export interface KpiEngine {
  production(context: ReportContext): ProductionKpi;
  jumbos(context: ReportContext): JumboAnalytics;
  operators(context: ReportContext): OperatorStat[];
  machines(context: ReportContext): MachineStat[];
  materials(context: ReportContext): MaterialStat[];
  rankings(context: ReportContext): Ranking[];
  trend(context: ReportContext): TrendPoint[];
  overview(context: ReportContext): AnalyticsOverview;
}

function computeProduction(context: ReportContext): ProductionKpi {
  const { sessions, archived } = context;
  const orders = sessions.length;
  const rolls = sessions.reduce((s, x) => s + x.result.total_rolls, 0);
  const materialUsedM = sessions.reduce((s, x) => s + x.result.used_length_m, 0);
  const usefulAreaM2 = sessions.reduce((s, x) => s + x.result.useful_area_m2, 0);
  const processed = sessions.reduce(
    (s, x) => s + (x.input.materialWidthMm / 1000) * x.result.used_length_m,
    0,
  );
  const wasteAreaM2 = archived.reduce((s, a) => s + a.statistics.wasteAreaM2, 0);
  const scrapAreaM2 = archived.reduce((s, a) => s + a.statistics.scrapAreaM2, 0);
  const totalLossesM2 = archived.reduce((s, a) => s + a.statistics.totalLossesM2, 0);
  return {
    orders,
    rolls,
    materialUsedM: round1(materialUsedM),
    usefulAreaM2: round1(usefulAreaM2),
    wasteAreaM2: round1(wasteAreaM2),
    scrapAreaM2: round1(scrapAreaM2),
    totalLossesM2: round1(totalLossesM2),
    avgUsagePercent: processed > 0 ? round1((usefulAreaM2 / processed) * 100) : 0,
    avgPerOrderM: orders > 0 ? round1(materialUsedM / orders) : 0,
    avgPerRollM: rolls > 0 ? round1(materialUsedM / rolls) : 0,
  };
}

function computeJumbos(context: ReportContext): JumboAnalytics {
  const lines = jumboLines(context);
  const count = (status: JumboStatus) => lines.filter((l) => l.status === status).length;
  const area = (line: JumboLine) => (line.initialWindingM * line.widthMm) / 1000;
  return {
    total: lines.length,
    onStock: count(JumboStatus.onStock),
    inWork: count(JumboStatus.inWork),
    toWriteOff: count(JumboStatus.toWriteOff),
    archived: count(JumboStatus.archived),
    avgAreaM2: round1(average(lines.map(area))),
    avgRemainderM: round1(average(lines.map((l) => l.remainderM))),
    avgUsagePercent: round1(average(lines.map((l) => l.usagePercent))),
  };
}

function computeOperators(context: ReportContext): OperatorStat[] {
  const groups = new Map<string, OperatorStat>();
  for (const session of context.sessions) {
    const operator = session.order.operator || "—";
    const stat =
      groups.get(operator) ??
      { operator, orders: 0, rolls: 0, materialUsedM: 0, usefulAreaM2: 0, wasteAreaM2: 0, wastePercent: 0 };
    stat.orders += 1;
    stat.rolls += session.result.total_rolls;
    stat.materialUsedM += session.result.used_length_m;
    stat.usefulAreaM2 += session.result.useful_area_m2;
    groups.set(operator, stat);
  }
  for (const waste of context.wastes) {
    const operator = waste.operator ?? "—";
    const stat = groups.get(operator);
    if (stat) {
      stat.wasteAreaM2 += waste.areaM2;
    }
  }
  const wasteByOperator = new Map<string, number[]>();
  for (const entry of context.archived) {
    const operator = entry.archivedBy ?? "—";
    const list = wasteByOperator.get(operator) ?? [];
    list.push(entry.statistics.wastePercent);
    wasteByOperator.set(operator, list);
  }
  return Array.from(groups.values()).map((stat) => ({
    ...stat,
    materialUsedM: round1(stat.materialUsedM),
    usefulAreaM2: round1(stat.usefulAreaM2),
    wasteAreaM2: round1(stat.wasteAreaM2),
    wastePercent: round1(average(wasteByOperator.get(stat.operator) ?? [])),
  }));
}

function computeMachines(context: ReportContext): MachineStat[] {
  const groups = new Map<Machine, MachineStat>();
  for (const session of context.sessions) {
    const machine = session.order.machine;
    const stat =
      groups.get(machine) ??
      {
        machine,
        machineTitle: machineTitle(machine),
        orders: 0,
        rolls: 0,
        materialUsedM: 0,
        usefulAreaM2: 0,
        hours: 0,
        productivity: 0,
      };
    stat.orders += 1;
    stat.rolls += session.result.total_rolls;
    stat.materialUsedM += session.result.used_length_m;
    stat.usefulAreaM2 += session.result.useful_area_m2;
    stat.hours += session.result.estimated_hours ?? 0;
    groups.set(machine, stat);
  }
  return Array.from(groups.values()).map((stat) => ({
    ...stat,
    materialUsedM: round1(stat.materialUsedM),
    usefulAreaM2: round1(stat.usefulAreaM2),
    hours: round1(stat.hours),
    productivity: stat.hours > 0 ? round1(stat.rolls / stat.hours) : 0,
  }));
}

function computeMaterials(context: ReportContext): MaterialStat[] {
  const groups = new Map<string, MaterialStat>();
  for (const line of jumboLines(context)) {
    const stat =
      groups.get(line.materialCode) ??
      { materialCode: line.materialCode, jumbos: 0, usedM: 0, remainderM: 0, usefulAreaM2: 0, orders: 0 };
    stat.jumbos += 1;
    stat.usedM += line.usedLength;
    stat.remainderM += line.remainderM;
    stat.usefulAreaM2 += line.usefulArea;
    stat.orders += line.ordersCount;
    groups.set(line.materialCode, stat);
  }
  return Array.from(groups.values()).map((stat) => ({
    ...stat,
    usedM: round1(stat.usedM),
    remainderM: round1(stat.remainderM),
    usefulAreaM2: round1(stat.usefulAreaM2),
  }));
}

function topEntries(
  source: Array<{ label: string; value: number; display: string }>,
  limit = 5,
): RankingEntry[] {
  return [...source].sort((a, b) => b.value - a.value).slice(0, limit);
}

function computeRankings(context: ReportContext): Ranking[] {
  const materials = computeMaterials(context);
  const operators = computeOperators(context);

  const customers = new Map<string, number>();
  for (const session of context.sessions) {
    const customer = session.order.customer || "—";
    customers.set(customer, (customers.get(customer) ?? 0) + 1);
  }

  const wasteReasons = new Map<WasteKind, number>();
  for (const waste of context.wastes) {
    wasteReasons.set(waste.kind, (wasteReasons.get(waste.kind) ?? 0) + waste.areaM2);
  }

  return [
    {
      key: "materials",
      title: "ТОП материалов",
      entries: topEntries(
        materials.map((m) => ({ label: m.materialCode, value: m.usedM, display: `${round1(m.usedM)} м` })),
      ),
    },
    {
      key: "operators",
      title: "ТОП операторов",
      entries: topEntries(
        operators.map((o) => ({ label: o.operator, value: o.orders, display: `${o.orders} зак.` })),
      ),
    },
    {
      key: "customers",
      title: "ТОП заказчиков",
      entries: topEntries(
        Array.from(customers.entries()).map(([label, value]) => ({ label, value, display: `${value} зак.` })),
      ),
    },
    {
      key: "waste",
      title: "ТОП причин брака",
      entries: topEntries(
        Array.from(wasteReasons.entries()).map(([kind, value]) => ({
          label: wasteKindTitle(kind),
          value: round1(value),
          display: `${round1(value)} м²`,
        })),
      ),
    },
  ];
}

function computeTrend(context: ReportContext): TrendPoint[] {
  const grouping =
    context.filter.grouping === ReportGrouping.none ? ReportGrouping.month : context.filter.grouping;
  const buckets = new Map<string, TrendPoint>();
  for (const session of context.sessions) {
    const key = bucketLabel(session.createdAt, grouping);
    const point =
      buckets.get(key) ?? { bucket: key, orders: 0, rolls: 0, materialUsedM: 0, usefulAreaM2: 0 };
    point.orders += 1;
    point.rolls += session.result.total_rolls;
    point.materialUsedM += session.result.used_length_m;
    point.usefulAreaM2 += session.result.useful_area_m2;
    buckets.set(key, point);
  }
  return Array.from(buckets.values())
    .map((p) => ({
      ...p,
      materialUsedM: round1(p.materialUsedM),
      usefulAreaM2: round1(p.usefulAreaM2),
    }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket));
}

export function createKpiEngine(): KpiEngine {
  const engine: KpiEngine = {
    production: computeProduction,
    jumbos: computeJumbos,
    operators: computeOperators,
    machines: computeMachines,
    materials: computeMaterials,
    rankings: computeRankings,
    trend: computeTrend,
    overview(context) {
      return {
        production: computeProduction(context),
        jumbos: computeJumbos(context),
        operators: computeOperators(context),
        machines: computeMachines(context),
        materials: computeMaterials(context),
        rankings: computeRankings(context),
        trend: computeTrend(context),
      };
    },
  };
  return engine;
}
