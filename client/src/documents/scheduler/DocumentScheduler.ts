import { DocumentSchedule } from "@/models";
import { defaultReportFilter, ReportKind, type ReportFilter } from "@/reports";
import type { SettingsRepository } from "@/repositories";
import type { KeyValueStore } from "@/storage/KeyValueStore";
import { storageKeys } from "@/storage/StorageKeys";
import type { GeneratedDocument } from "../models";
import { parseAddresses } from "../email/EmailValidation";
import type { DocumentService } from "../services/DocumentService";

interface SchedulerMeta {
  lastRunIso: string;
}

export interface SchedulerRunResult {
  ran: boolean;
  generated: GeneratedDocument[];
}

/**
 * Automatic report delivery scheduler.
 *
 * In a client build there is no background daemon, so the scheduler runs on app
 * launch: it computes the current period key for the configured cadence
 * (daily/weekly/monthly, default monthly) and, if that period has not been run
 * yet, generates the month's production and stock reports — sending them when
 * auto-send is enabled — and records the run. The "last day of month" trigger is
 * realised as a once-per-period run keyed on the month.
 */
export interface DocumentScheduler {
  checkAndRun(now?: Date): Promise<SchedulerRunResult>;
}

function isoWeek(date: Date): number {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = (tmp.getUTCDay() + 6) % 7;
  tmp.setUTCDate(tmp.getUTCDate() - dayNumber + 3);
  const firstThursday = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
  const firstDayNumber = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNumber + 3);
  return 1 + Math.round((tmp.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
}

function two(value: number): string {
  return String(value).padStart(2, "0");
}

function periodKey(schedule: DocumentSchedule, date: Date): string {
  const year = date.getFullYear();
  const month = two(date.getMonth() + 1);
  switch (schedule) {
    case DocumentSchedule.daily:
      return `${year}-${month}-${two(date.getDate())}`;
    case DocumentSchedule.weekly:
      return `${year}-W${two(isoWeek(date))}`;
    case DocumentSchedule.monthly:
      return `${year}-${month}`;
    case DocumentSchedule.off:
      return "";
  }
}

function monthRange(date: Date): { startDate: string; endDate: string } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const fmt = (d: Date) => `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
  return { startDate: fmt(start), endDate: fmt(end) };
}

export function createDocumentScheduler(
  service: DocumentService,
  settings: SettingsRepository,
  store: KeyValueStore,
): DocumentScheduler {
  return {
    async checkAndRun(now = new Date()) {
      const current = await settings.load();
      if (current.reportSchedule === DocumentSchedule.off) {
        return { ran: false, generated: [] };
      }

      const currentKey = periodKey(current.reportSchedule, now);
      const meta = await store.read<SchedulerMeta>(storageKeys.documentsMeta);
      const lastKey = meta ? periodKey(current.reportSchedule, new Date(meta.lastRunIso)) : null;
      if (currentKey === lastKey) {
        return { ran: false, generated: [] };
      }

      const { startDate, endDate } = monthRange(now);
      const filter: ReportFilter = { ...defaultReportFilter, startDate, endDate };
      const recipients = parseAddresses(current.reportRecipients);
      const cc = parseAddresses(current.reportCc);
      const bcc = parseAddresses(current.reportBcc);
      const shouldSend = current.autoSendReports && recipients.length > 0;

      const generated: GeneratedDocument[] = [];
      for (const kind of [ReportKind.production, ReportKind.stock]) {
        const request = { kind, filter, recipients, cc, bcc, automatic: true };
        const document = shouldSend
          ? await service.generateAndSend(request)
          : await service.generateAndStore(request);
        generated.push(document);
      }

      await store.write<SchedulerMeta>(storageKeys.documentsMeta, { lastRunIso: now.toISOString() });
      return { ran: true, generated };
    },
  };
}
