import { useCallback, useEffect, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import {
  JumboOperationType,
  JumboStatus,
  type Jumbo,
  type JumboOperation,
  type Material,
} from "@/models";
import {
  summarizeForClose,
  validateNonNegative,
  type CloseJumboOutcome,
  type JumboCloseSummary,
} from "@/services";
import { AuditAction } from "@/admin";

export interface JumboEdit {
  status: JumboStatus;
  currentRemainderM: number;
  comment: string;
}

interface JumboDetailViewModel {
  loading: boolean;
  jumbo: Jumbo | null;
  material: Material | null;
  operations: JumboOperation[];
  error: string | null;
  saving: boolean;
  /** Read-only summary shown before closing; null until the Jumbo loads. */
  closeSummary: JumboCloseSummary | null;
  /** True while the Jumbo can still be closed (not already archived). */
  canClose: boolean;
  closing: boolean;
  startUsage: () => Promise<void>;
  saveEdit: (edit: JumboEdit) => Promise<boolean>;
  close: (comment: string) => Promise<CloseJumboOutcome | undefined>;
}

/** ViewModel for the Jumbo detail card: full record, its material and the
 *  operation timeline, plus edit and start-usage actions. */
export function useJumboDetailViewModel(jumboId: string): JumboDetailViewModel {
  const { jumbos, materials, warehouse, settings, admin } = useServices();
  const [loading, setLoading] = useState(true);
  const [jumbo, setJumbo] = useState<Jumbo | null>(null);
  const [material, setMaterial] = useState<Material | null>(null);
  const [operations, setOperations] = useState<JumboOperation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const current = await jumbos.getById(jumboId);
      setJumbo(current ?? null);
      setMaterial(current ? (await materials.getById(current.materialId)) ?? null : null);
      setOperations(await warehouse.operationsFor(jumboId));
    } finally {
      setLoading(false);
    }
  }, [jumboId, jumbos, materials, warehouse]);

  useEffect(() => {
    void load();
  }, [load]);

  const startUsage = useCallback(async () => {
    const current = await settings.load();
    await warehouse.startUsage(jumboId, current.operator || undefined);
    await load();
  }, [warehouse, settings, jumboId, load]);

  const saveEdit = useCallback(
    async (edit: JumboEdit): Promise<boolean> => {
      if (!jumbo) {
        return false;
      }
      const validation = validateNonNegative(edit.currentRemainderM, "Остаток");
      if (validation) {
        setError(validation);
        return false;
      }
      setSaving(true);
      try {
        const remainderChanged = edit.currentRemainderM !== jumbo.currentRemainderM;
        const current = await settings.load();
        await warehouse.updateJumbo(
          {
            ...jumbo,
            status: edit.status,
            currentRemainderM: edit.currentRemainderM,
            comment: edit.comment.trim() || undefined,
          },
          {
            operator: current.operator || undefined,
            type: remainderChanged
              ? JumboOperationType.adjustment
              : JumboOperationType.edit,
          },
        );
        setError(null);
        await admin.audit.record(AuditAction.jumboEdit, {
          entity: "Джамб",
          entityId: jumbo.stockNumber,
          user: current.operator || undefined,
          details: remainderChanged
            ? `Остаток: ${edit.currentRemainderM} м`
            : "Изменение карточки",
        });
        await load();
        return true;
      } finally {
        setSaving(false);
      }
    },
    [jumbo, warehouse, settings, load, admin],
  );

  const close = useCallback(
    async (comment: string): Promise<CloseJumboOutcome | undefined> => {
      if (!jumbo || jumbo.status === JumboStatus.archived) {
        return undefined;
      }
      setClosing(true);
      try {
        const current = await settings.load();
        const outcome = await warehouse.closeJumbo({
          jumboId: jumbo.id,
          operator: current.operator || undefined,
          comment: comment.trim() || undefined,
        });
        await admin.audit.record(AuditAction.jumboArchive, {
          entity: "Джамб",
          entityId: jumbo.stockNumber,
          user: current.operator || undefined,
          details: "Джамб закрыт и перенесён в архив",
        });
        await load();
        return outcome;
      } finally {
        setClosing(false);
      }
    },
    [jumbo, warehouse, settings, load, admin],
  );

  return {
    loading,
    jumbo,
    material,
    operations,
    error,
    saving,
    closeSummary: jumbo ? summarizeForClose(jumbo) : null,
    canClose: jumbo !== null && jumbo.status !== JumboStatus.archived,
    closing,
    startUsage,
    saveEdit,
    close,
  };
}
