import { useCallback, useEffect, useMemo, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import { MaterialStatus, type Jumbo, type Material } from "@/models";
import { firstError, validatePositive, validateRequired } from "@/services";
import { AuditAction } from "@/admin";

export interface ReceiptItemDraft {
  stockNumber: string;
  widthMm: number;
  initialWindingM: number;
  comment: string;
}

function emptyItem(defaultWidth: number): ReceiptItemDraft {
  return { stockNumber: "", widthMm: defaultWidth, initialWindingM: 0, comment: "" };
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ReceiptViewModel {
  loading: boolean;
  materials: Material[];
  materialId: string;
  setMaterialId: (id: string) => void;
  arrivalDate: string;
  dateLocked: boolean;
  changeArrivalDate: (date: string) => void;
  items: ReceiptItemDraft[];
  setItemField: <K extends keyof ReceiptItemDraft>(
    index: number,
    key: K,
    value: ReceiptItemDraft[K],
  ) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
  error: string | null;
  saving: boolean;
  submit: () => Promise<Jumbo[] | null>;
}

/**
 * ViewModel for the raw-material receipt screen. Supports adding several Jumbos
 * of one batch: a single arrival date (editable once) applies to all rows, and
 * on submit every record plus its "Приход" journal entry is created through the
 * warehouse service.
 */
export function useReceiptViewModel(): ReceiptViewModel {
  const { materials: materialRepository, jumbos: jumboRepository, warehouse, settings, admin } =
    useServices();

  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [existingNumbers, setExistingNumbers] = useState<Set<string>>(new Set());
  const [materialId, setMaterialId] = useState("");
  const [arrivalDate, setArrivalDate] = useState(todayIsoDate);
  const [dateLocked, setDateLocked] = useState(false);
  const [items, setItems] = useState<ReceiptItemDraft[]>([emptyItem(0)]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [materialList, jumboList] = await Promise.all([
        materialRepository.getAll(),
        jumboRepository.getAll(),
      ]);
      if (!active) {
        return;
      }
      const usable = materialList.filter((m) => m.status === MaterialStatus.active);
      setMaterials(usable);
      setExistingNumbers(new Set(jumboList.map((j) => j.stockNumber)));
      if (usable.length > 0) {
        setMaterialId(usable[0].id);
        setItems([emptyItem(usable[0].standardWidthMm)]);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [materialRepository, jumboRepository]);

  const selectedMaterial = useMemo(
    () => materials.find((m) => m.id === materialId),
    [materials, materialId],
  );

  const changeArrivalDate = useCallback(
    (date: string) => {
      if (dateLocked) {
        return;
      }
      setArrivalDate(date);
      setDateLocked(true);
      setError(null);
    },
    [dateLocked],
  );

  const setItemField = useCallback(
    <K extends keyof ReceiptItemDraft>(index: number, key: K, value: ReceiptItemDraft[K]) => {
      setItems((previous) =>
        previous.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
      );
      setError(null);
    },
    [],
  );

  const addItem = useCallback(() => {
    setItems((previous) => [...previous, emptyItem(selectedMaterial?.standardWidthMm ?? 0)]);
  }, [selectedMaterial]);

  const removeItem = useCallback((index: number) => {
    setItems((previous) =>
      previous.length > 1 ? previous.filter((_, i) => i !== index) : previous,
    );
  }, []);

  const submit = useCallback(async (): Promise<Jumbo[] | null> => {
    if (!selectedMaterial) {
      setError("Выберите материал");
      return null;
    }

    const seen = new Set<string>();
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const rowLabel = `Строка ${index + 1}`;
      const fieldError = firstError(
        validateRequired(item.stockNumber, `${rowLabel}: номер склада`),
        validatePositive(item.widthMm, `${rowLabel}: ширина`),
        validatePositive(item.initialWindingM, `${rowLabel}: намотка`),
      );
      if (fieldError) {
        setError(fieldError);
        return null;
      }
      const number = item.stockNumber.trim();
      if (existingNumbers.has(number) || seen.has(number)) {
        setError(`Номер склада «${number}» уже существует`);
        return null;
      }
      seen.add(number);
    }

    setSaving(true);
    try {
      const current = await settings.load();
      const created = await warehouse.receiveBatch({
        materialId: selectedMaterial.id,
        materialCode: selectedMaterial.code,
        arrivalDate: new Date(arrivalDate).toISOString(),
        operator: current.operator || undefined,
        items: items.map((item) => ({
          stockNumber: item.stockNumber.trim(),
          widthMm: item.widthMm,
          initialWindingM: item.initialWindingM,
          comment: item.comment.trim() || undefined,
        })),
      });
      await admin.audit.record(AuditAction.jumboCreate, {
        entity: "Партия",
        entityId: selectedMaterial.code,
        user: current.operator || undefined,
        details: `Оприходовано Джамбов: ${created.length}`,
      });
      return created;
    } finally {
      setSaving(false);
    }
  }, [selectedMaterial, items, existingNumbers, arrivalDate, warehouse, settings, admin]);

  return {
    loading,
    materials,
    materialId,
    setMaterialId,
    arrivalDate,
    dateLocked,
    changeArrivalDate,
    items,
    setItemField,
    addItem,
    removeItem,
    error,
    saving,
    submit,
  };
}
