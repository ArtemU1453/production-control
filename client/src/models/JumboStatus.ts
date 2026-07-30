/**
 * Lifecycle state of a Jumbo roll. The colour role drives the visual treatment
 * used by StatusBadge and warehouse listings in later phases.
 */
export enum JumboStatus {
  /** На складе — received, not yet used. */
  onStock = "onStock",
  /** В работе — currently being cut. */
  inWork = "inWork",
  /** Подлежит списанию — remainder too small to use. */
  toWriteOff = "toWriteOff",
  /** Архив — written off and archived. */
  archived = "archived",
}

export type StatusColorRole = "neutral" | "warning" | "danger" | "muted";

interface StatusDescriptor {
  readonly title: string;
  readonly colorRole: StatusColorRole;
}

const descriptors: Record<JumboStatus, StatusDescriptor> = {
  [JumboStatus.onStock]: { title: "На складе", colorRole: "neutral" },
  [JumboStatus.inWork]: { title: "В работе", colorRole: "warning" },
  [JumboStatus.toWriteOff]: { title: "Подлежит списанию", colorRole: "danger" },
  [JumboStatus.archived]: { title: "Архив", colorRole: "muted" },
};

export function jumboStatusTitle(status: JumboStatus): string {
  return descriptors[status].title;
}

export function jumboStatusColorRole(status: JumboStatus): StatusColorRole {
  return descriptors[status].colorRole;
}

export const jumboStatusOrder: readonly JumboStatus[] = [
  JumboStatus.onStock,
  JumboStatus.inWork,
  JumboStatus.toWriteOff,
  JumboStatus.archived,
];
