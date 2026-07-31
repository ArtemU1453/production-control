import { NotificationSeverity } from "./Notification";

/** Category of an operator recommendation. */
export enum RecommendationKind {
  prepareJumbo = "prepareJumbo",
  orderMaterial = "orderMaterial",
  checkMachine = "checkMachine",
  scheduleMaintenance = "scheduleMaintenance",
  checkRawQuality = "checkRawQuality",
}

/**
 * A derived recommendation. Recommendations are computed from notifications,
 * forecasts and quality metrics — they never introduce new data, only advise on
 * existing signals. Priority mirrors {@link NotificationSeverity}.
 */
export interface Recommendation {
  id: string;
  kind: RecommendationKind;
  priority: NotificationSeverity;
  title: string;
  detail: string;
}
