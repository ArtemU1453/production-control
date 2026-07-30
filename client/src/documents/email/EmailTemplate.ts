import type { AppSettings } from "@/models";

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

/** Human month-year label, e.g. "Июль 2026". */
export function monthLabel(iso?: string): string {
  const date = iso ? new Date(iso) : new Date();
  const valid = Number.isNaN(date.getTime()) ? new Date() : date;
  return `${MONTHS[valid.getMonth()]} ${valid.getFullYear()}`;
}

export interface EmailContent {
  subject: string;
  body: string;
}

/**
 * Builds the email subject and body from the settings templates, substituting
 * the `{month}` placeholder. Empty templates fall back to sensible defaults.
 */
export function buildEmailContent(month: string, settings: AppSettings): EmailContent {
  const subjectTemplate = settings.reportSubject.trim() || "Производственный отчёт за {month}";
  const bodyTemplate =
    settings.reportBody.trim() ||
    "Добрый день.\n\nВо вложении находится автоматически сформированный производственный отчёт.\n\nПисьмо создано автоматически.";
  return {
    subject: subjectTemplate.replaceAll("{month}", month),
    body: bodyTemplate.replaceAll("{month}", month),
  };
}
