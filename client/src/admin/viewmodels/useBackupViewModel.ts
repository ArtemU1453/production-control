import { useCallback, useEffect, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/extensions/date";
import type { BackupMeta } from "../models";
import type { StorageProviderInfo } from "../storage/StorageProvider";
import type { DataExportProvider, DataImportProvider } from "../export/DataExport";

interface BackupViewModel {
  loading: boolean;
  busy: boolean;
  meta: BackupMeta;
  lastBackupLabel: string;
  lastRestoreLabel: string;
  storageProviders: StorageProviderInfo[];
  exportProviders: DataExportProvider[];
  importProviders: DataImportProvider[];
  createBackup: () => Promise<void>;
  downloadJson: () => Promise<void>;
  importJson: (json: string) => Promise<void>;
}

function label(iso: string | undefined): string {
  return iso ? formatDateTime(iso) : "—";
}

/** ViewModel for the backup / restore screen. Backup and restore run through
 *  the admin BackupService; downloads use an in-browser blob so no data leaves
 *  the device unless the operator saves the file. */
export function useBackupViewModel(): BackupViewModel {
  const { admin } = useServices();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState<BackupMeta>({});

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setMeta(await admin.backup.meta());
    } finally {
      setLoading(false);
    }
  }, [admin]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createBackup = useCallback(async () => {
    setBusy(true);
    try {
      await admin.backup.createBackup();
      await reload();
      toast({ title: "Резервная копия создана" });
    } finally {
      setBusy(false);
    }
  }, [admin, reload, toast]);

  const downloadJson = useCallback(async () => {
    setBusy(true);
    try {
      const json = await admin.backup.exportJson();
      await reload();
      if (typeof document !== "undefined" && typeof URL.createObjectURL === "function") {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
      }
      toast({ title: "Файл резервной копии сформирован" });
    } finally {
      setBusy(false);
    }
  }, [admin, reload, toast]);

  const importJson = useCallback(
    async (json: string) => {
      setBusy(true);
      try {
        await admin.backup.importJson(json);
        await reload();
        toast({ title: "Данные восстановлены", description: "Перезагрузите приложение." });
      } catch (error) {
        toast({
          title: "Не удалось восстановить",
          description: error instanceof Error ? error.message : "Некорректный файл",
          variant: "destructive",
        });
      } finally {
        setBusy(false);
      }
    },
    [admin, reload, toast],
  );

  return {
    loading,
    busy,
    meta,
    lastBackupLabel: label(meta.lastBackupAt),
    lastRestoreLabel: label(meta.lastRestoreAt),
    storageProviders: admin.storageProviders,
    exportProviders: admin.exportProviders,
    importProviders: admin.importProviders,
    createBackup,
    downloadJson,
    importJson,
  };
}
