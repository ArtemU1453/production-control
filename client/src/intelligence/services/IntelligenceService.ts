import {
  defaultReportFilter,
  reportFilterKey,
  type ReportFilter,
  type ReportRepository,
} from "@/reports";
import type { KeyValueStore } from "@/storage/KeyValueStore";
import { storageKeys } from "@/storage/StorageKeys";
import { nowIso } from "@/extensions/date";
import type { SettingsRepository } from "@/repositories";
import type { GeneratedDocument } from "@/documents/models";
import type { BackupMeta } from "@/admin";
import {
  NotificationStatus,
  notificationSeverityOrder,
  type AppNotification,
  type ForecastResult,
  type QualityReport,
  type Recommendation,
} from "../models";
import { buildNotifications } from "../engine/NotificationEngine";
import { computeForecast } from "../engine/ForecastEngine";
import { computeQuality } from "../engine/QualityEngine";
import { buildRecommendations } from "../engine/RecommendationEngine";

export interface Insights {
  notifications: AppNotification[];
  forecast: ForecastResult;
  quality: QualityReport;
  recommendations: Recommendation[];
  generatedAt: string;
}

export interface IntelligenceServiceDeps {
  reportRepository: ReportRepository;
  settings: SettingsRepository;
  documentsHistory: () => Promise<GeneratedDocument[]>;
  backupMeta: () => Promise<BackupMeta>;
  store: KeyValueStore;
}

/**
 * Decision-support facade. Loads the shared {@link ReportContext} once, runs the
 * pure notification / forecast / quality / recommendation engines, and merges
 * the operator-assigned notification statuses (the only persisted part). The
 * context-derived result is cached by data signature, mirroring the analytics
 * layer, so re-opening a screen with unchanged data does no recomputation.
 */
export interface IntelligenceService {
  insights(filter?: ReportFilter): Promise<Insights>;
  setNotificationStatus(id: string, status: NotificationStatus): Promise<void>;
}

interface CachedBase {
  key: string;
  notifications: AppNotification[];
  forecast: ForecastResult;
  quality: QualityReport;
}

export function createIntelligenceService(deps: IntelligenceServiceDeps): IntelligenceService {
  let cache: CachedBase | null = null;

  async function readStates(): Promise<Record<string, NotificationStatus>> {
    return (await deps.store.read<Record<string, NotificationStatus>>(storageKeys.notificationStates)) ?? {};
  }

  return {
    async insights(filter = defaultReportFilter) {
      const context = await deps.reportRepository.loadContext(filter);
      const key = `${reportFilterKey(filter)}|${context.signature}`;

      let base = cache;
      if (!base || base.key !== key) {
        const quality = computeQuality(context);
        const forecast = computeForecast(context);
        const [documents, backupMeta] = await Promise.all([
          deps.documentsHistory(),
          deps.backupMeta(),
        ]);
        const settings = await deps.settings.load();
        const notifications = buildNotifications({
          context,
          settings,
          quality,
          documents,
          backupMeta,
          now: new Date(),
        });
        base = { key, notifications, forecast, quality };
        cache = base;
      }

      // Merge persisted statuses onto freshly generated notifications.
      const states = await readStates();
      const notifications = base.notifications
        .map((n) => ({ ...n, status: states[n.id] ?? n.status }))
        .sort(
          (a, b) =>
            notificationSeverityOrder[a.severity] - notificationSeverityOrder[b.severity] ||
            a.title.localeCompare(b.title),
        );

      const recommendations = buildRecommendations(notifications, base.forecast, base.quality);

      return {
        notifications,
        forecast: base.forecast,
        quality: base.quality,
        recommendations,
        generatedAt: nowIso(),
      };
    },

    async setNotificationStatus(id, status) {
      const states = await readStates();
      if (status === NotificationStatus.new) {
        delete states[id];
      } else {
        states[id] = status;
      }
      await deps.store.write(storageKeys.notificationStates, states);
    },
  };
}
