import type { ReportContext } from "@/reports";
import { JumboStatus, machineTitle, type Jumbo } from "@/models";
import type {
  ForecastResult,
  JumboForecast,
  LoadForecast,
  MaterialForecast,
} from "../models";

/**
 * Forecast engine — pure projection over a {@link ReportContext}.
 *
 * All forecasts are simple, explainable extrapolations of observed averages
 * (no hidden models): consumption per order, per day, and resource shares over
 * the window the data spans. Deliberately transparent so an operator can trust
 * the numbers.
 */

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const HORIZON_DAYS = 30;

function isActive(jumbo: Jumbo): boolean {
  return (
    jumbo.currentRemainderM > 0 &&
    (jumbo.status === JumboStatus.onStock ||
      jumbo.status === JumboStatus.inWork ||
      jumbo.status === JumboStatus.toWriteOff)
  );
}

function windowDaysOf(context: ReportContext): number {
  const times = context.sessions
    .map((s) => new Date(s.createdAt).getTime())
    .filter((t) => Number.isFinite(t));
  if (times.length === 0) {
    return 1;
  }
  const span = (Math.max(...times) - Math.min(...times)) / MS_PER_DAY;
  return Math.max(1, Math.round(span) || 1);
}

function addDays(now: Date, days: number): string {
  return new Date(now.getTime() + days * MS_PER_DAY).toISOString();
}

export function computeForecast(context: ReportContext, now: Date = new Date()): ForecastResult {
  const windowDays = windowDaysOf(context);
  const totalOrders = context.sessions.length;
  const totalUsedM = context.sessions.reduce((s, x) => s + x.result.used_length_m, 0);
  const avgDaysPerOrder = totalOrders > 0 ? windowDays / totalOrders : 0;

  // Per in-work Jumbo forecast.
  const jumbos: JumboForecast[] = context.jumbos
    .filter((jumbo) => jumbo.status === JumboStatus.inWork || jumbo.status === JumboStatus.toWriteOff)
    .map((jumbo) => {
      const avgConsumptionPerOrderM =
        jumbo.ordersCount > 0 ? jumbo.usedLength / jumbo.ordersCount : 0;
      const ordersLeft =
        avgConsumptionPerOrderM > 0
          ? Math.floor(jumbo.currentRemainderM / avgConsumptionPerOrderM)
          : 0;
      const estimatedEndDate =
        avgConsumptionPerOrderM > 0 && avgDaysPerOrder > 0
          ? addDays(now, Math.max(0, ordersLeft) * avgDaysPerOrder)
          : undefined;
      return {
        jumboId: jumbo.id,
        stockNumber: jumbo.stockNumber,
        materialCode: jumbo.materialCode,
        currentRemainderM: Math.round(jumbo.currentRemainderM),
        avgConsumptionPerOrderM: Math.round(avgConsumptionPerOrderM),
        ordersLeft,
        estimatedEndDate,
      };
    })
    .sort((a, b) => a.ordersLeft - b.ordersLeft);

  // Material / stock forecast.
  const active = context.jumbos.filter(isActive);
  const totalRemainderM = active.reduce((s, j) => s + j.currentRemainderM, 0);
  const avgDailyConsumptionM = totalUsedM / windowDays;
  const daysOfStockLeft =
    avgDailyConsumptionM > 0 ? Math.round(totalRemainderM / avgDailyConsumptionM) : 0;
  const avgWindingM =
    active.length > 0
      ? active.reduce((s, j) => s + j.initialWindingM, 0) / active.length
      : context.jumbos.length > 0
        ? context.jumbos.reduce((s, j) => s + j.initialWindingM, 0) / context.jumbos.length
        : 0;
  const projectedNeedM = avgDailyConsumptionM * HORIZON_DAYS;
  const deficitM = Math.max(0, projectedNeedM - totalRemainderM);
  const jumbosNeededNext30Days = avgWindingM > 0 ? Math.ceil(deficitM / avgWindingM) : 0;

  const material: MaterialForecast = {
    avgDailyConsumptionM: Math.round(avgDailyConsumptionM),
    totalRemainderM: Math.round(totalRemainderM),
    daysOfStockLeft,
    jumbosNeededNext30Days,
  };

  // Resource load forecasts.
  function loadBy(keyOf: (index: number) => string): LoadForecast[] {
    const counts = new Map<string, number>();
    context.sessions.forEach((_, i) => {
      const key = keyOf(i);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, orders]) => ({
        name,
        orders,
        share: totalOrders > 0 ? orders / totalOrders : 0,
        projectedOrders: Math.round((orders / windowDays) * HORIZON_DAYS),
      }))
      .sort((a, b) => b.orders - a.orders);
  }

  const machines = loadBy((i) => machineTitle(context.sessions[i].order.machine));
  const operators = loadBy((i) => context.sessions[i].order.operator || "—");

  return { jumbos, material, machines, operators, windowDays };
}
