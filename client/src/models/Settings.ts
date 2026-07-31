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

  // Производство
  /** Порог остатка Джамба (м) для перевода в «Подлежит списанию». */
  jumboThresholdM: number;
  /** Количество станков. */
  machineCount: number;
  /** Названия станков (через запятую). */
  machineNames: string;
  /** Формат даты (для отображения). */
  dateFormat: string;
  /** Формат времени (для отображения). */
  timeFormat: string;

  // Безопасность
  /** Включён ли PIN-код. */
  pinEnabled: boolean;
  /** PIN-код (локальная блокировка; не средство криптозащиты). */
  pin: string;
  /** Биометрия (если поддерживается устройством) — подготовлено. */
  biometricsEnabled: boolean;
  /** Автоблокировка, минут (0 — выключена). */
  autoLockMinutes: number;
  /** Подтверждать удаление. */
  confirmDelete: boolean;

  // Резервное копирование
  /** Автоматическое резервное копирование. */
  autoBackup: boolean;
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

  jumboThresholdM: 300,
  machineCount: 2,
  machineNames: "Станок №1, Станок №2",
  dateFormat: "ДД.ММ.ГГГГ",
  timeFormat: "ЧЧ:ММ",

  pinEnabled: false,
  pin: "",
  biometricsEnabled: false,
  autoLockMinutes: 0,
  confirmDelete: true,

  autoBackup: false,
};
