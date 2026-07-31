import { CollectionRepository } from "@/repositories";
import type { KeyValueStore } from "@/storage/KeyValueStore";
import { storageKeys } from "@/storage/StorageKeys";
import { nowIso } from "@/extensions/date";
import { makeId } from "@/utilities/id";
import type { AppSettings } from "@/models";
import type { SettingsChangeEntry } from "../models";

/** Human-readable labels for settings fields shown in the change log. */
const fieldTitles: Partial<Record<keyof AppSettings, string>> = {
  companyName: "Название предприятия",
  operator: "Оператор",
  email: "Email",
  autoSendReports: "Авто-отправка отчётов",
  reportRecipients: "Получатели отчётов",
  reportCc: "Копия (CC)",
  reportBcc: "Скрытая копия (BCC)",
  reportSubject: "Тема письма",
  reportBody: "Текст письма",
  reportSchedule: "Расписание рассылки",
  jumboThresholdM: "Порог списания Джамба, м",
  machineCount: "Количество станков",
  machineNames: "Названия станков",
  dateFormat: "Формат даты",
  timeFormat: "Формат времени",
  pinEnabled: "PIN-код",
  pin: "Значение PIN",
  biometricsEnabled: "Биометрия",
  autoLockMinutes: "Автоблокировка, мин",
  confirmDelete: "Подтверждение удаления",
  autoBackup: "Авто-резервное копирование",
};

/** Sensitive fields whose values are masked in the log. */
const maskedFields = new Set<keyof AppSettings>(["pin"]);

function display(field: keyof AppSettings, value: AppSettings[keyof AppSettings]): string {
  if (maskedFields.has(field)) {
    return value ? "••••" : "—";
  }
  if (typeof value === "boolean") {
    return value ? "вкл." : "выкл.";
  }
  const text = String(value ?? "");
  return text.length > 0 ? text : "—";
}

/**
 * Records a per-field audit of settings changes (who / what / when / old →
 * new), so configuration drift is traceable over the app's lifetime.
 */
export interface SettingsHistoryService {
  record(previous: AppSettings, next: AppSettings, user?: string): Promise<void>;
  list(): Promise<SettingsChangeEntry[]>;
  clear(): Promise<void>;
}

export function createSettingsHistoryService(store: KeyValueStore): SettingsHistoryService {
  const repository = new CollectionRepository<SettingsChangeEntry>(
    store,
    storageKeys.settingsHistory,
  );

  return {
    async record(previous, next, user) {
      const timestamp = nowIso();
      const keys = Object.keys(next) as Array<keyof AppSettings>;
      for (const field of keys) {
        if (previous[field] === next[field]) {
          continue;
        }
        await repository.save({
          id: makeId(),
          timestamp,
          user,
          field,
          fieldTitle: fieldTitles[field] ?? field,
          oldValue: display(field, previous[field]),
          newValue: display(field, next[field]),
        });
      }
    },
    async list() {
      const all = await repository.getAll();
      return all.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    },
    async clear() {
      await repository.clear();
    },
  };
}
