import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import {
  CardView,
  EmptyState,
  LoadingView,
  ScreenScaffold,
  SecondaryButton,
  StatusBadge,
} from "@/components";
import { cn } from "@/lib/utils";
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import { formatDateTime } from "@/extensions/date";
import type { StatusColorRole } from "@/models";
import {
  NotificationSeverity,
  NotificationStatus,
  notificationSeverityTitle,
  notificationStatusTitle,
  type AppNotification,
} from "../models";
import { useNotificationsViewModel } from "../viewmodels";

function severityTone(severity: NotificationSeverity): StatusColorRole {
  switch (severity) {
    case NotificationSeverity.critical:
      return "danger";
    case NotificationSeverity.high:
      return "warning";
    case NotificationSeverity.medium:
      return "neutral";
    case NotificationSeverity.low:
      return "muted";
  }
}

function statusTone(status: NotificationStatus): StatusColorRole {
  return status === NotificationStatus.done ? "muted" : status === NotificationStatus.seen ? "neutral" : "warning";
}

function NotificationCard({
  notification,
  onSeen,
  onDone,
}: {
  notification: AppNotification;
  onSeen: () => void;
  onDone: () => void;
}) {
  const done = notification.status === NotificationStatus.done;
  return (
    <CardView className={cn(done && "opacity-60")} animate>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={notificationSeverityTitle(notification.severity)} tone={severityTone(notification.severity)} />
              <StatusBadge label={notificationStatusTitle(notification.status)} tone={statusTone(notification.status)} />
            </div>
            <div className="mt-1.5 text-sm font-semibold">{notification.title}</div>
            <div className="text-xs text-muted-foreground">{formatDateTime(notification.createdAt)}</div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{notification.description}</p>
        <div className="flex items-start gap-2 rounded-2xl bg-secondary/60 p-3 text-sm">
          <span className="text-muted-foreground">Рекомендация:</span>
          <span className="font-medium">{notification.action}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {notification.href ? (
            <Link href={notification.href}>
              <SecondaryButton icon={ChevronRight}>Открыть</SecondaryButton>
            </Link>
          ) : null}
          {notification.status === NotificationStatus.new ? (
            <SecondaryButton onClick={onSeen}>{strings.intelligence.markSeen}</SecondaryButton>
          ) : null}
          {!done ? (
            <SecondaryButton icon={icons.logs} onClick={onDone}>
              {strings.intelligence.markDone}
            </SecondaryButton>
          ) : null}
        </div>
      </div>
    </CardView>
  );
}

/** Notification Center — auto-generated production alerts with severity, a
 *  recommended action and an operator-managed status. */
export function NotificationCenterView() {
  const vm = useNotificationsViewModel();

  return (
    <ScreenScaffold
      title={strings.intelligence.notificationsTitle}
      subtitle={strings.intelligence.notificationsSubtitle}
    >
      {vm.loading ? (
        <LoadingView />
      ) : vm.notifications.length === 0 ? (
        <EmptyState icon={icons.notifications} title={strings.intelligence.noNotifications} />
      ) : (
        <div className="space-y-3">
          {vm.notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onSeen={() => void vm.setStatus(notification.id, NotificationStatus.seen)}
              onDone={() => void vm.setStatus(notification.id, NotificationStatus.done)}
            />
          ))}
        </div>
      )}
    </ScreenScaffold>
  );
}
