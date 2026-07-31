import { useCallback, useEffect, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import type { User } from "../models";

interface UsersViewModel {
  loading: boolean;
  users: User[];
  current: User | undefined;
  reload: () => Promise<void>;
}

/** ViewModel for the user list. The app is single-user today; this surfaces the
 *  seeded administrator and any additional accounts for the multi-user roadmap. */
export function useUsersViewModel(): UsersViewModel {
  const { admin } = useServices();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [current, setCurrent] = useState<User | undefined>(undefined);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [list, active] = await Promise.all([admin.users.list(), admin.users.current()]);
      setUsers(list);
      setCurrent(active);
    } finally {
      setLoading(false);
    }
  }, [admin]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { loading, users, current, reload };
}
