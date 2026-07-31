import { useState } from "react";
import {
  CardView,
  InfoRow,
  LoadingView,
  ScreenScaffold,
  SegmentedControl,
  StatusBadge,
  type SegmentOption,
} from "@/components";
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import { formatDate } from "@/extensions/date";
import {
  NotificationSeverity,
  QualityDimension,
  notificationSeverityTitle,
  qualityDimensionTitle,
  type Recommendation,
} from "../models";
import { useDecisionsViewModel } from "../viewmodels";

const dimensionOptions: ReadonlyArray<SegmentOption<QualityDimension>> = [
  { value: QualityDimension.material, label: qualityDimensionTitle(QualityDimension.material) },
  { value: QualityDimension.operator, label: qualityDimensionTitle(QualityDimension.operator) },
  { value: QualityDimension.machine, label: qualityDimensionTitle(QualityDimension.machine) },
];

function priorityTone(priority: NotificationSeverity) {
  switch (priority) {
    case NotificationSeverity.critical:
      return "danger" as const;
    case NotificationSeverity.high:
      return "warning" as const;
    case NotificationSeverity.medium:
      return "neutral" as const;
    case NotificationSeverity.low:
      return "muted" as const;
  }
}

function RecommendationRow({ recommendation }: { recommendation: Recommendation }) {
  return (
    <div className="flex items-start gap-3 border-b border-border/50 pb-3 last:border-none last:pb-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{recommendation.title}</span>
          <StatusBadge label={notificationSeverityTitle(recommendation.priority)} tone={priorityTone(recommendation.priority)} />
        </div>
        <div className="text-xs text-muted-foreground">{recommendation.detail}</div>
      </div>
    </div>
  );
}

/** Decision Center — forecasting, quality control and recommendations derived
 *  from accumulated production data. */
export function DecisionsView() {
  const vm = useDecisionsViewModel();
  const [dimension, setDimension] = useState<QualityDimension>(QualityDimension.material);

  if (vm.loading || !vm.insights) {
    return (
      <ScreenScaffold title={strings.intelligence.decisionsTitle} subtitle={strings.intelligence.decisionsSubtitle}>
        <LoadingView />
      </ScreenScaffold>
    );
  }

  const { forecast, quality, recommendations } = vm.insights;
  const qualityRows = quality.metrics.filter((m) => m.dimension === dimension);

  return (
    <ScreenScaffold title={strings.intelligence.decisionsTitle} subtitle={strings.intelligence.decisionsSubtitle}>
      <div className="space-y-4">
        {/* Recommendations */}
        <CardView title={strings.intelligence.recommendations} icon={icons.insights} animate>
          {recommendations.length === 0 ? (
            <div className="py-2 text-sm text-muted-foreground">{strings.intelligence.noRecommendations}</div>
          ) : (
            <div className="space-y-3">
              {recommendations.map((r) => (
                <RecommendationRow key={r.id} recommendation={r} />
              ))}
            </div>
          )}
        </CardView>

        {/* Forecast — material */}
        <CardView title={strings.intelligence.forecast} icon={icons.forecast} headerTone="accent" animate>
          <div className="space-y-2">
            <InfoRow label="Средний расход в день" value={`${forecast.material.avgDailyConsumptionM} м`} />
            <InfoRow label="Остаток материала" value={`${forecast.material.totalRemainderM} м`} />
            <InfoRow label="Запаса хватит" value={`~${forecast.material.daysOfStockLeft} дн.`} />
            <InfoRow label="Нужно Джамбов (30 дн.)" value={forecast.material.jumbosNeededNext30Days} last />
          </div>
        </CardView>

        {/* Forecast — per Jumbo */}
        {forecast.jumbos.length > 0 ? (
          <CardView title="Прогноз по Джамбам" icon={icons.jumbo} animate>
            <div className="space-y-2">
              {forecast.jumbos.slice(0, 12).map((j) => (
                <InfoRow
                  key={j.jumboId}
                  label={`№${j.stockNumber} · ${j.materialCode}`}
                  value={
                    j.estimatedEndDate
                      ? `${j.ordersLeft} зак. · до ${formatDate(j.estimatedEndDate)}`
                      : `${j.ordersLeft} зак.`
                  }
                />
              ))}
            </div>
          </CardView>
        ) : null}

        {/* Quality control */}
        <CardView
          title={strings.intelligence.quality}
          icon={icons.gauge}
          headerTrailing={
            <StatusBadge
              label={`Отходы ${quality.overallDefectPercent}%`}
              tone={quality.overallDefectPercent > quality.anomalyThresholdPercent ? "warning" : "neutral"}
            />
          }
          animate
        >
          <div className="space-y-3">
            <SegmentedControl options={dimensionOptions} value={dimension} onChange={setDimension} aria-label="Разрез качества" />
            {qualityRows.length === 0 ? (
              <div className="py-2 text-sm text-muted-foreground">Нет данных за период</div>
            ) : (
              <div className="space-y-2">
                {qualityRows.map((m) => (
                  <div key={`${m.dimension}-${m.subject}`} className="flex items-center justify-between gap-3 border-b border-border/50 pb-2 text-sm last:border-none last:pb-0">
                    <span className="min-w-0 truncate">{m.subject}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={m.anomaly ? "font-semibold text-destructive" : "font-medium"}>{m.defectPercent}%</span>
                      {m.anomaly ? <StatusBadge label={strings.intelligence.anomaly} tone="danger" /> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardView>
      </div>
    </ScreenScaffold>
  );
}
