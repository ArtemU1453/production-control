import type { ReportContext } from "@/reports";
import { JumboStatus, type AppSettings } from "@/models";
import type { GeneratedDocument } from "@/documents/models";
import { DocumentStatus } from "@/documents/models";
import type { BackupMeta } from "@/admin";
import {
  NotificationKind,
  NotificationSeverity,
  NotificationStatus,
  type AppNotification,
} from "../models";
import type { QualityReport } from "../models";

/** Tunable thresholds for the notification rules (sensible defaults). */
export interface NotificationThresholds {
  /** Days without operations before an in-work Jumbo is flagged inactive. */
  inactiveDays: number;
  /** Days since last backup before flagging staleness. */
  backupStaleDays: number;
  /** Available metrage below which a material is "running low". */
  materialLowM: number;
  /** Overall loss share (%) above which quality is flagged. */
  defectLimitPercent: number;
  /** Combined losses share (%) above which waste is flagged. */
  wasteLimitPercent: number;
}

export const defaultNotificationThresholds: NotificationThresholds = {
  inactiveDays: 14,
  backupStaleDays: 7,
  materialLowM: 1000,
  defectLimitPercent: 15,
  wasteLimitPercent: 25,
};

export interface NotificationInput {
  context: ReportContext;
  settings: AppSettings;
  quality: QualityReport;
  documents: GeneratedDocument[];
  backupMeta: BackupMeta;
  now: Date;
  thresholds?: NotificationThresholds;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysBetween(from: string | undefined, now: Date): number {
  if (!from) {
    return Number.POSITIVE_INFINITY;
  }
  const t = new Date(from).getTime();
  return Number.isFinite(t) ? (now.getTime() - t) / MS_PER_DAY : Number.POSITIVE_INFINITY;
}

/**
 * Notification engine — pure rules over already-aggregated data. Each rule
 * yields deterministic ids (`kind:subject`) so operator-assigned statuses stay
 * stable across regeneration; only status is persisted, everything else is
 * recomputed. No storage access.
 */
export function buildNotifications(input: NotificationInput): AppNotification[] {
  const { context, settings, quality, documents, backupMeta, now } = input;
  const t = input.thresholds ?? defaultNotificationThresholds;
  const threshold = typeof settings.jumboThresholdM === "number" ? settings.jumboThresholdM : 300;
  const iso = now.toISOString();
  const out: AppNotification[] = [];

  const push = (
    kind: NotificationKind,
    subject: string,
    severity: NotificationSeverity,
    title: string,
    description: string,
    action: string,
    href?: string,
  ) => {
    out.push({
      id: `${kind}:${subject}`,
      kind,
      severity,
      createdAt: iso,
      title,
      description,
      action,
      status: NotificationStatus.new,
      href,
    });
  };

  // 1. Low remainder on active Jumbos.
  for (const jumbo of context.jumbos) {
    if (jumbo.status !== JumboStatus.inWork && jumbo.status !== JumboStatus.toWriteOff) {
      continue;
    }
    if (jumbo.currentRemainderM < threshold) {
      const critical = jumbo.currentRemainderM < threshold * 0.5;
      push(
        NotificationKind.lowRemainder,
        jumbo.id,
        critical ? NotificationSeverity.critical : NotificationSeverity.high,
        `Джамб №${jumbo.stockNumber}: низкий остаток`,
        `Остаток ${Math.round(jumbo.currentRemainderM)} м (порог ${threshold} м).`,
        "Подготовьте новый Джамб для следующего заказа.",
        `/warehouse/${jumbo.id}`,
      );
    }
  }

  // 2. Material running low (available metrage across active Jumbos).
  const availableByMaterial = new Map<string, number>();
  for (const jumbo of context.jumbos) {
    if (jumbo.currentRemainderM <= 0 || jumbo.status === JumboStatus.archived) {
      continue;
    }
    availableByMaterial.set(
      jumbo.materialCode,
      (availableByMaterial.get(jumbo.materialCode) ?? 0) + jumbo.currentRemainderM,
    );
  }
  const usedMaterialCodes = new Set(context.sessions.map((s) => s.materialCode));
  for (const code of Array.from(usedMaterialCodes)) {
    const available = availableByMaterial.get(code) ?? 0;
    if (available <= 0) {
      push(
        NotificationKind.materialLow,
        code,
        NotificationSeverity.high,
        `Материал ${code} закончился`,
        "Нет доступных Джамбов этого материала на складе.",
        "Закажите материал и оприходуйте новую партию.",
      );
    } else if (available < t.materialLowM) {
      push(
        NotificationKind.materialLow,
        code,
        NotificationSeverity.medium,
        `Материал ${code} заканчивается`,
        `Доступно ${Math.round(available)} м на складе.`,
        "Запланируйте пополнение запаса.",
      );
    }
  }

  // 3. High overall defect rate.
  if (quality.overallDefectPercent > t.defectLimitPercent) {
    push(
      NotificationKind.highDefectRate,
      "overall",
      NotificationSeverity.high,
      "Высокий процент отходов",
      `Общая доля отходов ${quality.overallDefectPercent}% выше нормы (${t.defectLimitPercent}%).`,
      "Проверьте качество сырья и настройку станков.",
    );
  }

  // 4. Inactive in-work Jumbos.
  const lastOpByJumbo = new Map<string, number>();
  for (const op of context.operations) {
    const time = new Date(op.timestamp).getTime();
    if (Number.isFinite(time)) {
      lastOpByJumbo.set(op.jumboId, Math.max(lastOpByJumbo.get(op.jumboId) ?? 0, time));
    }
  }
  for (const jumbo of context.jumbos) {
    if (jumbo.status !== JumboStatus.inWork) {
      continue;
    }
    const last = lastOpByJumbo.get(jumbo.id);
    const idleDays = last ? (now.getTime() - last) / MS_PER_DAY : Number.POSITIVE_INFINITY;
    if (idleDays >= t.inactiveDays) {
      push(
        NotificationKind.jumboInactive,
        jumbo.id,
        NotificationSeverity.medium,
        `Джамб №${jumbo.stockNumber}: нет активности`,
        `Более ${t.inactiveDays} дней без операций.`,
        "Проверьте статус Джамба и продолжите использование или закройте его.",
        `/warehouse/${jumbo.id}`,
      );
    }
  }

  // 5. Report send failures.
  const failed = documents.filter((d) => d.status === DocumentStatus.failed).length;
  if (failed > 0) {
    push(
      NotificationKind.reportSendFailed,
      "documents",
      NotificationSeverity.high,
      "Ошибки отправки отчётов",
      `Не отправлено документов: ${failed}.`,
      "Проверьте адреса получателей и повторите отправку.",
      "/documents",
    );
  }

  // 6. Stale / missing backup.
  const backupAge = daysBetween(backupMeta.lastBackupAt, now);
  if (backupAge >= t.backupStaleDays) {
    const never = !backupMeta.lastBackupAt;
    push(
      NotificationKind.backupStale,
      "backup",
      never ? NotificationSeverity.high : NotificationSeverity.medium,
      never ? "Резервная копия не создавалась" : "Резервная копия устарела",
      never
        ? "Данные ни разу не резервировались."
        : `Последняя копия ${Math.round(backupAge)} дн. назад.`,
      "Создайте резервную копию в настройках.",
      "/settings/backup",
    );
  }

  // 7. Excess total losses.
  const totalLosses = quality.overallDefectPercent + quality.overallScrapPercent;
  if (totalLosses > t.wasteLimitPercent) {
    push(
      NotificationKind.wasteExceeded,
      "overall",
      NotificationSeverity.medium,
      "Превышен уровень потерь",
      `Суммарные потери ${Math.round(totalLosses * 10) / 10}% (норма ${t.wasteLimitPercent}%).`,
      "Проанализируйте контроль качества по материалам и станкам.",
    );
  }

  return out;
}
