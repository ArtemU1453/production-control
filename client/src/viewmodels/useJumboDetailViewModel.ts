import { useCallback, useEffect, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import {
  JumboOperationType,
  JumboStatus,
  type Jumbo,
  type JumboOperation,
  type Material,
} from "@/models";
import { validateNonNegative } from "@/services";

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
  startUsage: () => Promise<void>;
  saveEdit: (edit: JumboEdit) => Promise<boolean>;
}

/** ViewModel for the Jumbo detail card: full record, its material and the
 *  operation timeline, plus edit and start-usage actions. */
export function useJumboDetailViewModel(jumboId: string): JumboDetailViewModel {
  const { jumbos, materials, warehouse, settings } = useServices();
  const [loading, setLoading] = useState(true);
  const [jumbo, setJumbo] = useState<Jumbo | null>(null);
  const [material, setMaterial] = useState<Material | null>(null);
  const [operations, setOperations] = useState<JumboOperation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
        await load();
        return true;
      } finally {
        setSaving(false);
      }
    },
    [jumbo, warehouse, settings, load],
  );

  return { loading, jumbo, material, operations, error, saving, startUsage, saveEdit };
}
