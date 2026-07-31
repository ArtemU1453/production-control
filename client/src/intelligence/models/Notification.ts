/** Severity of an intelligence notification, ordered most-urgent first. */
export enum NotificationSeverity {
  critical = "critical",
  high = "high",
  medium = "medium",
  low = "low",
}

const severityTitles: Record<NotificationSeverity, string> = {
  [NotificationSeverity.critical]: "Критично",
  [NotificationSeverity.high]: "Высокая",
  [NotificationSeverity.medium]: "Средняя",
  [NotificationSeverity.low]: "Низкая",
};

export function notificationSeverityTitle(severity: NotificationSeverity): string {
  return severityTitles[severity];
}

/** Sort weight — lower = more urgent (Critical first). */
export const notificationSeverityOrder: Record<NotificationSeverity, number> = {
  [NotificationSeverity.critical]: 0,
  [NotificationSeverity.high]: 1,
  [NotificationSeverity.medium]: 2,
  [NotificationSeverity.low]: 3,
};

/** Category of a generated notification. */
export enum NotificationKind {
  lowRemainder = "lowRemainder",
  materialLow = "materialLow",
  highDefectRate = "highDefectRate",
  jumboInactive = "jumboInactive",
  reportSendFailed = "reportSendFailed",
  backupStale = "backupStale",
  wasteExceeded = "wasteExceeded",
}

/** Operator-facing lifecycle of a notification. */
export enum NotificationStatus {
  new = "new",
  seen = "seen",
  done = "done",
}

const statusTitles: Record<NotificationStatus, string> = {
  [NotificationStatus.new]: "Новое",
  [NotificationStatus.seen]: "Просмотрено",
  [NotificationStatus.done]: "Выполнено",
};

export function notificationStatusTitle(status: NotificationStatus): string {
  return statusTitles[status];
}

/**
 * A generated notification. Its `id` is **deterministic** (kind + subject), so
 * that the same underlying condition keeps the operator-assigned status across
 * regenerations; only the status is persisted, the rest is recomputed from data.
 */
export interface AppNotification {
  id: string;
  kind: NotificationKind;
  severity: NotificationSeverity;
  createdAt: string;
  title: string;
  description: string;
  /** Recommended action for the operator. */
  action: string;
  status: NotificationStatus;
  /** Optional deep-link target (e.g. a Jumbo card). */
  href?: string;
}
