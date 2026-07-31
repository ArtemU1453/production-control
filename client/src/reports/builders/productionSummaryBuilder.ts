import { machineTitle, type Machine } from "@/models";
import { ReportKind } from "../models/ReportKind";
import type { ReportContext } from "../repositories/ReportContext";
import {
  buildReportData,
  fmtA,
  fmtM,
  fmtP,
  makeRow,
  round1,
  summaryItem,
  type ReportBuilder,
} from "./support";

interface MachineKpi {
  orders: number;
  rolls: number;
  material: number;
  useful: number;
  processed: number;
  waste: number;
  hours: number;
  timedOrders: number;
}

function emptyMachineKpi(): MachineKpi {
  return {
    orders: 0,
    rolls: 0,
    material: 0,
    useful: 0,
    processed: 0,
    waste: 0,
    hours: 0,
    timedOrders: 0,
  };
}

/**
 * Consolidated manager overview ("Производственная сводка").
 *
 * A single report that unites the enterprise-wide KPIs with a per-machine KPI
 * table and adds two indicators no other report exposes on their own:
 * the average raw-material remainder after a Jumbo is closed and the average
 * time per order. It reads only the already-prepared {@link ReportContext}
 * (sessions + archived Jumbos), reusing the same aggregation the on-screen
 * analytics and the other reports run on — no new data and no business logic.
 */
export const productionSummaryBuilder: ReportBuilder = {
  kind: ReportKind.productionSummary,
  build(context: ReportContext) {
    const { sessions, jumbos, archived, filter } = context;

    // Enterprise-wide indicators.
    const orders = sessions.length;
    const rolls = sessions.reduce((sum, s) => sum + s.result.total_rolls, 0);
    const jumbosUsed = new Set(sessions.map((s) => s.jumboId)).size;
    const materialUsedM = sessions.reduce((sum, s) => sum + s.result.used_length_m, 0);
    const usefulAreaM2 = sessions.reduce((sum, s) => sum + s.result.useful_area_m2, 0);
    const processedAreaM2 = sessions.reduce(
      (sum, s) => sum + (s.input.materialWidthMm / 1000) * s.result.used_length_m,
      0,
    );
    const wasteAreaM2 = sessions.reduce((sum, s) => sum + s.result.waste_area_m2, 0);
    const usagePercent = processedAreaM2 > 0 ? (usefulAreaM2 / processedAreaM2) * 100 : 0;
    const wastePercent = processedAreaM2 > 0 ? (wasteAreaM2 / processedAreaM2) * 100 : 0;

    // New consolidated indicators.
    const timedSessions = sessions.filter((s) => s.result.estimated_hours != null);
    const totalHours = timedSessions.reduce((sum, s) => sum + (s.result.estimated_hours ?? 0), 0);
    const avgOrderHours = timedSessions.length > 0 ? totalHours / timedSessions.length : 0;
    const avgRemainderAfterClose =
      archived.length > 0
        ? archived.reduce((sum, a) => sum + a.statistics.finalRemainderM, 0) / archived.length
        : 0;
    const avgJumboUsage =
      archived.length > 0
        ? archived.reduce((sum, a) => sum + a.statistics.usefulPercent, 0) / archived.length
        : 0;
    const remainingRawM = jumbos.reduce((sum, j) => sum + j.currentRemainderM, 0);

    const summary = [
      summaryItem("orders", "Количество заказов", String(orders)),
      summaryItem("rolls", "Количество рулонов", String(rolls)),
      summaryItem("jumbosUsed", "Использовано Джамбов", String(jumbosUsed)),
      summaryItem("material", "Общий расход материала", fmtM(materialUsedM)),
      summaryItem("useful", "Полезная площадь", fmtA(usefulAreaM2)),
      summaryItem("usage", "Процент использования материала", fmtP(usagePercent)),
      summaryItem("waste", "Процент брака", fmtP(wastePercent)),
      summaryItem("avgOrderTime", "Среднее время на заказ", `${round1(avgOrderHours)} ч`),
      summaryItem("avgRemainder", "Средний остаток после закрытия Джамба", fmtM(avgRemainderAfterClose)),
      summaryItem("avgJumbo", "Средний % использования Джамба", fmtP(avgJumboUsage)),
      summaryItem("remaining", "Остаток сырья на складе", fmtM(remainingRawM)),
      summaryItem("closedJumbos", "Закрыто Джамбов за период", String(archived.length)),
    ];

    // Per-machine KPI table.
    const groups = new Map<Machine, MachineKpi>();
    for (const session of sessions) {
      const machine = session.order.machine;
      const kpi = groups.get(machine) ?? emptyMachineKpi();
      kpi.orders += 1;
      kpi.rolls += session.result.total_rolls;
      kpi.material += session.result.used_length_m;
      kpi.useful += session.result.useful_area_m2;
      kpi.processed += (session.input.materialWidthMm / 1000) * session.result.used_length_m;
      kpi.waste += session.result.waste_area_m2;
      if (session.result.estimated_hours != null) {
        kpi.hours += session.result.estimated_hours;
        kpi.timedOrders += 1;
      }
      groups.set(machine, kpi);
    }

    const rows = Array.from(groups.entries())
      .sort((a, b) => b[1].orders - a[1].orders)
      .map(([machine, kpi]) => {
        const machineWaste = kpi.processed > 0 ? (kpi.waste / kpi.processed) * 100 : 0;
        const machineAvgTime = kpi.timedOrders > 0 ? kpi.hours / kpi.timedOrders : 0;
        return makeRow(machine, {
          machine: machineTitle(machine),
          orders: kpi.orders,
          rolls: kpi.rolls,
          material: fmtM(kpi.material),
          useful: fmtA(kpi.useful),
          waste: fmtP(machineWaste),
          avgTime: `${round1(machineAvgTime)} ч`,
        });
      });

    return buildReportData({
      kind: ReportKind.productionSummary,
      title: "Производственная сводка",
      filter,
      columns: [
        { key: "machine", title: "Станок" },
        { key: "orders", title: "Заказы", numeric: true },
        { key: "rolls", title: "Рулоны", numeric: true },
        { key: "material", title: "Материал", numeric: true },
        { key: "useful", title: "Полезная площадь", numeric: true },
        { key: "waste", title: "Брак", numeric: true },
        { key: "avgTime", title: "Ср. время/заказ", numeric: true },
      ],
      rows,
      summary,
      metadata: {
        machines: groups.size,
        avgOrderHours: round1(avgOrderHours),
        avgRemainderAfterClose: round1(avgRemainderAfterClose),
      },
    });
  },
};
