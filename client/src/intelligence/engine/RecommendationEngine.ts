import {
  NotificationKind,
  NotificationSeverity,
  QualityDimension,
  RecommendationKind,
  type AppNotification,
  type ForecastResult,
  type QualityReport,
  type Recommendation,
} from "../models";

/**
 * Recommendation engine — pure derivation from already-computed signals
 * (notifications, forecasts, quality). It advises, it never invents data.
 */
export function buildRecommendations(
  notifications: AppNotification[],
  forecast: ForecastResult,
  quality: QualityReport,
): Recommendation[] {
  const out: Recommendation[] = [];
  const has = (kind: NotificationKind) => notifications.some((n) => n.kind === kind);

  // Prepare a new Jumbo.
  const urgentJumbo = forecast.jumbos.some((j) => j.ordersLeft <= 1);
  if (has(NotificationKind.lowRemainder) || urgentJumbo) {
    out.push({
      id: RecommendationKind.prepareJumbo,
      kind: RecommendationKind.prepareJumbo,
      priority: urgentJumbo ? NotificationSeverity.high : NotificationSeverity.medium,
      title: "Подготовьте новый Джамб",
      detail: "Остаток используемых Джамбов близок к порогу списания.",
    });
  }

  // Order material.
  if (
    has(NotificationKind.materialLow) ||
    forecast.material.jumbosNeededNext30Days > 0 ||
    (forecast.material.daysOfStockLeft > 0 && forecast.material.daysOfStockLeft < 14)
  ) {
    out.push({
      id: RecommendationKind.orderMaterial,
      kind: RecommendationKind.orderMaterial,
      priority: NotificationSeverity.high,
      title: "Закажите материал",
      detail: `Запаса хватит примерно на ${forecast.material.daysOfStockLeft} дн.; на 30 дней нужно ещё ~${forecast.material.jumbosNeededNext30Days} Джамб(ов).`,
    });
  }

  // Check machine (quality anomaly on a machine).
  const machineAnomaly = quality.metrics.find(
    (m) => m.dimension === QualityDimension.machine && m.anomaly,
  );
  if (machineAnomaly) {
    out.push({
      id: `${RecommendationKind.checkMachine}:${machineAnomaly.subject}`,
      kind: RecommendationKind.checkMachine,
      priority: NotificationSeverity.medium,
      title: `Проверьте станок «${machineAnomaly.subject}»`,
      detail: `Доля отходов ${machineAnomaly.defectPercent}% выше нормы.`,
    });
  }

  // Schedule maintenance (a single resource carries most of the load).
  const topMachine = forecast.machines[0];
  if (topMachine && topMachine.share > 0.7 && forecast.machines.length > 1) {
    out.push({
      id: RecommendationKind.scheduleMaintenance,
      kind: RecommendationKind.scheduleMaintenance,
      priority: NotificationSeverity.low,
      title: "Запланируйте обслуживание",
      detail: `Станок «${topMachine.name}» выполняет ${Math.round(topMachine.share * 100)}% заказов — распределите нагрузку и проведите ТО.`,
    });
  }

  // Check raw-material quality (material anomaly or high overall defect).
  const materialAnomaly = quality.metrics.find(
    (m) => m.dimension === QualityDimension.material && m.anomaly,
  );
  if (materialAnomaly || has(NotificationKind.highDefectRate)) {
    out.push({
      id: RecommendationKind.checkRawQuality,
      kind: RecommendationKind.checkRawQuality,
      priority: NotificationSeverity.medium,
      title: "Проверьте качество сырья",
      detail: materialAnomaly
        ? `Материал ${materialAnomaly.subject}: доля отходов ${materialAnomaly.defectPercent}%.`
        : "Общий уровень отходов выше нормы.",
    });
  }

  return out;
}
