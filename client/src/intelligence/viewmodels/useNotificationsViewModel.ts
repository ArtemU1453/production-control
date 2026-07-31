import { useCallback, useEffect, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import { NotificationStatus, type AppNotification } from "../models";

interface NotificationsViewModel {
  loading: boolean;
  notifications: AppNotification[];
  activeCount: number;
  setStatus: (id: string, status: NotificationStatus) => Promise<void>;
  reload: () => Promise<void>;
}

/** ViewModel for the Notification Center. Notifications are generated from data
 *  on each load; only the operator-assigned status is persisted. */
export function useNotificationsViewModel(): NotificationsViewModel {
  const { intelligence } = useServices();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const insights = await intelligence.intelligence.insights();
      setNotifications(insights.notifications);
    } finally {
      setLoading(false);
    }
  }, [intelligence]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setStatus = useCallback(
    async (id: string, status: NotificationStatus) => {
      await intelligence.intelligence.setNotificationStatus(id, status);
      await reload();
    },
    [intelligence, reload],
  );

  const activeCount = notifications.filter((n) => n.status !== NotificationStatus.done).length;

  return { loading, notifications, activeCount, setStatus, reload };
}
