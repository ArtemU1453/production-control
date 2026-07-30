import { DocumentSchedule } from "./DocumentSchedule";

/** Persisted application settings. Backed by local storage today; the shape is
 *  stable so the backing store can change without touching call sites. */
export interface AppSettings {
  /** Email for report delivery (primary contact). */
  email: string;
  /** Название предприятия — enterprise name. */
  companyName: string;
  /** Оператор — default operator name. */
  operator: string;
  /** Автоматическая отправка — auto-send generated reports. */
  autoSendReports: boolean;

  /** Получатели отчётов — comma/newline separated recipient addresses. */
  reportRecipients: string;
  /** Копия (CC) — comma/newline separated. */
  reportCc: string;
  /** Скрытая копия (BCC) — comma/newline separated. */
  reportBcc: string;
  /** Тема письма (supports the {month} placeholder). */
  reportSubject: string;
  /** Текст письма. */
  reportBody: string;
  /** Расписание автоматической отправки. */
  reportSchedule: DocumentSchedule;
}

export const defaultSettings: AppSettings = {
  email: "",
  companyName: "",
  operator: "",
  autoSendReports: false,
  reportRecipients: "",
  reportCc: "",
  reportBcc: "",
  reportSubject: "Производственный отчёт за {month}",
  reportBody:
    "Добрый день.\n\nВо вложении находится автоматически сформированный производственный отчёт.\n\nПисьмо создано автоматически.",
  reportSchedule: DocumentSchedule.monthly,
};
