/** Persisted application settings. Backed by local storage today; the shape is
 *  stable so the backing store can change without touching call sites. */
export interface AppSettings {
  /** Email for report delivery. */
  email: string;
  /** Название предприятия — enterprise name. */
  companyName: string;
  /** Оператор — default operator name. */
  operator: string;
  /** Автоматическая отправка — auto-send generated reports. */
  autoSendReports: boolean;
}

export const defaultSettings: AppSettings = {
  email: "",
  companyName: "",
  operator: "",
  autoSendReports: false,
};
