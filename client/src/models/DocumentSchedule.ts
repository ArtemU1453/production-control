/** Automatic report delivery cadence. Monthly is the project default. */
export enum DocumentSchedule {
  off = "off",
  daily = "daily",
  weekly = "weekly",
  monthly = "monthly",
}

const titles: Record<DocumentSchedule, string> = {
  [DocumentSchedule.off]: "Выключено",
  [DocumentSchedule.daily]: "Ежедневно",
  [DocumentSchedule.weekly]: "Еженедельно",
  [DocumentSchedule.monthly]: "Ежемесячно",
};

export function documentScheduleTitle(schedule: DocumentSchedule): string {
  return titles[schedule];
}

export const documentScheduleOrder: readonly DocumentSchedule[] = [
  DocumentSchedule.off,
  DocumentSchedule.daily,
  DocumentSchedule.weekly,
  DocumentSchedule.monthly,
];
