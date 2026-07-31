import { useCallback, useEffect, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import { nowIso } from "@/extensions/date";
import { makeId } from "@/utilities/id";
import { MaterialStatus, type Material } from "@/models";
import {
  firstError,
  validateMaterialCode,
  validatePositive,
  validateRequired,
} from "@/services";

export interface MaterialDraft {
  code: string;
  name: string;
  manufacturer: string;
  thicknessMicron: number;
  standardWidthMm: number;
  description: string;
  status: MaterialStatus;
}

const emptyDraft: MaterialDraft = {
  code: "",
  name: "",
  manufacturer: "",
  thicknessMicron: 0,
  standardWidthMm: 0,
  description: "",
  status: MaterialStatus.active,
};

export interface MaterialDeleteResult {
  ok: boolean;
  /** Set when deletion is blocked (e.g. the material is still referenced). */
  message?: string;
}

interface MaterialEditorViewModel {
  loading: boolean;
  isNew: boolean;
  draft: MaterialDraft;
  error: string | null;
  saving: boolean;
  setField: <K extends keyof MaterialDraft>(key: K, value: MaterialDraft[K]) => void;
  save: () => Promise<boolean>;
  remove: () => Promise<MaterialDeleteResult>;
}

/** ViewModel backing the material create/edit form, including uniqueness and
 *  field validation. Returns `true` from `save` when persistence succeeded. */
export function useMaterialEditorViewModel(materialId?: string): MaterialEditorViewModel {
  const { materials: repository, jumbos, archivedJumbos } = useServices();
  const isNew = !materialId;
  const [loading, setLoading] = useState(!isNew);
  const [draft, setDraft] = useState<MaterialDraft>(emptyDraft);
  const [existing, setExisting] = useState<Material | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!materialId) {
      return;
    }
    let active = true;
    void (async () => {
      const material = await repository.getById(materialId);
      if (active && material) {
        setExisting(material);
        setDraft({
          code: material.code,
          name: material.name,
          manufacturer: material.manufacturer,
          thicknessMicron: material.thicknessMicron,
          standardWidthMm: material.standardWidthMm,
          description: material.description,
          status: material.status,
        });
      }
      if (active) {
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [materialId, repository]);

  const setField = useCallback(
    <K extends keyof MaterialDraft>(key: K, value: MaterialDraft[K]) => {
      setDraft((previous) => ({ ...previous, [key]: value }));
      setError(null);
    },
    [],
  );

  const save = useCallback(async (): Promise<boolean> => {
    const validation = firstError(
      validateMaterialCode(draft.code),
      validateRequired(draft.name, "Название"),
      validatePositive(draft.thicknessMicron, "Толщина"),
      validatePositive(draft.standardWidthMm, "Стандартная ширина"),
    );
    if (validation) {
      setError(validation);
      return false;
    }

    const code = draft.code.trim();
    const duplicate = await repository.findByCode(code);
    if (duplicate && duplicate.id !== existing?.id) {
      setError("Материал с таким кодом уже существует");
      return false;
    }

    setSaving(true);
    try {
      const material: Material = {
        id: existing?.id ?? makeId(),
        code,
        name: draft.name.trim(),
        manufacturer: draft.manufacturer.trim(),
        thicknessMicron: draft.thicknessMicron,
        standardWidthMm: draft.standardWidthMm,
        description: draft.description.trim(),
        createdAt: existing?.createdAt ?? nowIso(),
        status: draft.status,
      };
      await repository.save(material);
      return true;
    } finally {
      setSaving(false);
    }
  }, [draft, existing, repository]);

  const remove = useCallback(async (): Promise<MaterialDeleteResult> => {
    if (!materialId) {
      return { ok: false, message: "Материал ещё не сохранён" };
    }
    // Referential guard: a material used by any Jumbo (active or archived)
    // cannot be deleted — that would orphan warehouse records. Offer to archive
    // the material in the reference book instead.
    const [activeJumbos, archive] = await Promise.all([jumbos.getAll(), archivedJumbos.getAll()]);
    const usedByActive = activeJumbos.filter((jumbo) => jumbo.materialId === materialId).length;
    const usedByArchive = archive.filter((entry) => entry.jumbo.materialId === materialId).length;
    const usedCount = usedByActive + usedByArchive;
    if (usedCount > 0) {
      return {
        ok: false,
        message: `Материал используется в ${usedCount} Джамб(ах) и не может быть удалён. Переведите его в архив в справочнике.`,
      };
    }
    await repository.delete(materialId);
    return { ok: true };
  }, [materialId, repository, jumbos, archivedJumbos]);

  return { loading, isNew, draft, error, saving, setField, save, remove };
}
