import { useCallback, useEffect, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import type { AuditEntry, ErrorLogEntry } from "../models";

interface LogsViewModel {
  loading: boolean;
  errors: ErrorLogEntry[];
  audit: AuditEntry[];
  clearErrors: () => Promise<void>;
  clearAudit: () => Promise<void>;
  reload: () => Promise<void>;
}

/** ViewModel for the logs screen: lists error-log and audit entries newest
 *  first and clears each stream. */
export function useLogsViewModel(): LogsViewModel {
  const { admin } = useServices();
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<ErrorLogEntry[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [errorList, auditList] = await Promise.all([
        admin.errorLog.list(),
        admin.audit.list(),
      ]);
      setErrors(errorList);
      setAudit(auditList);
    } finally {
      setLoading(false);
    }
  }, [admin]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const clearErrors = useCallback(async () => {
    await admin.errorLog.clear();
    await reload();
  }, [admin, reload]);

  const clearAudit = useCallback(async () => {
    await admin.audit.clear();
    await reload();
  }, [admin, reload]);

  return { loading, errors, audit, clearErrors, clearAudit, reload };
}
