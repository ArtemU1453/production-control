import { useCallback, useEffect, useMemo, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import {
  FinishedRollStatus,
  machineTitle,
  type FinishedRoll,
  type Material,
} from "@/models";

/** Status filter — a concrete status or "all". */
export type FinishedGoodsStatusFilter = "all" | FinishedRollStatus;

/** The set of column filters exposed by the finished-goods screen. An empty
 *  string means "no filter" for that dimension. */
export interface FinishedGoodsFilters {
  materialId: string;
  widthMm: string;
  lengthM: string;
  date: string;
  orderNumber: string;
  operator: string;
  machine: string;
}

export const emptyFinishedGoodsFilters: FinishedGoodsFilters = {
  materialId: "",
  widthMm: "",
  lengthM: "",
  date: "",
  orderNumber: "",
  operator: "",
  machine: "",
};

/** Aggregate counters shown in the analytics strip. */
export interface FinishedGoodsAnalytics {
  total: number;
  inOrder: number;
  inStock: number;
  reserved: number;
  shipped: number;
  byMaterial: { code: string; count: number }[];
  byOrder: { orderNumber: string; count: number }[];
}

function isoDate(iso: string): string {
  return iso.slice(0, 10);
}

/** Resolves the material code for an id, preferring the code carried on the
 *  rolls (always present) and falling back to the material record. */
function materialCodeFor(
  id: string,
  rolls: FinishedRoll[],
  materialsById: Map<string, Material>,
): string {
  const fromRoll = rolls.find((roll) => roll.materialId === id)?.materialCode;
  return fromRoll ?? materialsById.get(id)?.code ?? id;
}

/**
 * ViewModel for the finished-goods warehouse (Готовая продукция).
 *
 * Loads every finished roll, exposes quick search + column filters, derives the
 * analytics counters, and forwards the reserve / release / ship actions to the
 * {@link FinishedGoodsService}. Read-only over the production flow — it never
 * creates rolls itself (arrival is automatic on order completion).
 */
export function useFinishedGoodsViewModel() {
  const { finishedGoods, materials } = useServices();

  const [loading, setLoading] = useState(true);
  const [rolls, setRolls] = useState<FinishedRoll[]>([]);
  const [materialsById, setMaterialsById] = useState<Map<string, Material>>(new Map());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<FinishedGoodsStatusFilter>("all");
  const [filters, setFilters] = useState<FinishedGoodsFilters>(emptyFinishedGoodsFilters);

  const load = useCallback(async () => {
    const [rollList, materialList] = await Promise.all([finishedGoods.list(), materials.getAll()]);
    setRolls(rollList);
    setMaterialsById(new Map(materialList.map((material) => [material.id, material])));
  }, [finishedGoods, materials]);

  useEffect(() => {
    let active = true;
    void (async () => {
      await load();
      if (active) {
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [load]);

  const setFilter = useCallback(<K extends keyof FinishedGoodsFilters>(key: K, value: FinishedGoodsFilters[K]) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
  }, []);
  const resetFilters = useCallback(() => {
    setFilters(emptyFinishedGoodsFilters);
    setStatus("all");
    setQuery("");
  }, []);

  // Distinct option lists for the filter selects (derived from the data).
  const options = useMemo(() => {
    const widths = new Set<number>();
    const lengths = new Set<number>();
    const dates = new Set<string>();
    const orders = new Set<string>();
    const operators = new Set<string>();
    const machines = new Set<string>();
    const materialIds = new Set<string>();
    for (const roll of rolls) {
      widths.add(roll.widthMm);
      lengths.add(roll.lengthM);
      dates.add(isoDate(roll.producedAt));
      if (roll.orderNumber) orders.add(roll.orderNumber);
      if (roll.operator) operators.add(roll.operator);
      machines.add(roll.machine);
      materialIds.add(roll.materialId);
    }
    return {
      widths: Array.from(widths).sort((a, b) => a - b),
      lengths: Array.from(lengths).sort((a, b) => a - b),
      dates: Array.from(dates).sort((a, b) => b.localeCompare(a)),
      orders: Array.from(orders).sort((a, b) => b.localeCompare(a)),
      operators: Array.from(operators).sort((a, b) => a.localeCompare(b)),
      machines: Array.from(machines).sort(),
      materials: Array.from(materialIds)
        .map((id) => ({ id, code: materialCodeFor(id, rolls, materialsById) }))
        .sort((a, b) => a.code.localeCompare(b.code)),
    };
  }, [rolls, materialsById]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rolls.filter((roll) => {
      if (status !== "all" && roll.status !== status) return false;
      if (filters.materialId && roll.materialId !== filters.materialId) return false;
      if (filters.widthMm && roll.widthMm !== Number(filters.widthMm)) return false;
      if (filters.lengthM && roll.lengthM !== Number(filters.lengthM)) return false;
      if (filters.date && isoDate(roll.producedAt) !== filters.date) return false;
      if (filters.orderNumber && roll.orderNumber !== filters.orderNumber) return false;
      if (filters.operator && roll.operator !== filters.operator) return false;
      if (filters.machine && roll.machine !== filters.machine) return false;
      if (needle) {
        const haystack = [
          roll.number,
          roll.id,
          roll.orderNumber,
          roll.materialCode,
          roll.jumboStockNumber,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [rolls, status, filters, query]);

  const analytics = useMemo<FinishedGoodsAnalytics>(() => {
    const byMaterialMap = new Map<string, number>();
    const byOrderMap = new Map<string, number>();
    let inOrder = 0;
    let inStock = 0;
    let reserved = 0;
    let shipped = 0;
    for (const roll of rolls) {
      if (roll.status === FinishedRollStatus.inOrder) inOrder += 1;
      else if (roll.status === FinishedRollStatus.inStock) inStock += 1;
      else if (roll.status === FinishedRollStatus.reserved) reserved += 1;
      else if (roll.status === FinishedRollStatus.shipped) shipped += 1;
      byMaterialMap.set(roll.materialCode, (byMaterialMap.get(roll.materialCode) ?? 0) + 1);
      if (roll.orderNumber) byOrderMap.set(roll.orderNumber, (byOrderMap.get(roll.orderNumber) ?? 0) + 1);
    }
    return {
      total: rolls.length,
      inOrder,
      inStock,
      reserved,
      shipped,
      byMaterial: Array.from(byMaterialMap.entries())
        .map(([code, count]) => ({ code, count }))
        .sort((a, b) => b.count - a.count),
      byOrder: Array.from(byOrderMap.entries())
        .map(([orderNumber, count]) => ({ orderNumber, count }))
        .sort((a, b) => b.count - a.count),
    };
  }, [rolls]);

  const statusCounts = useMemo(() => {
    const counts: Record<FinishedGoodsStatusFilter, number> = {
      all: rolls.length,
      [FinishedRollStatus.inOrder]: 0,
      [FinishedRollStatus.inStock]: 0,
      [FinishedRollStatus.reserved]: 0,
      [FinishedRollStatus.shipped]: 0,
    };
    for (const roll of rolls) {
      counts[roll.status] += 1;
    }
    return counts;
  }, [rolls]);

  const reserve = useCallback(
    async (id: string, operator?: string) => {
      await finishedGoods.reserve(id, operator);
      await load();
    },
    [finishedGoods, load],
  );
  const releaseReservation = useCallback(
    async (id: string, operator?: string) => {
      await finishedGoods.releaseReservation(id, operator);
      await load();
    },
    [finishedGoods, load],
  );
  const ship = useCallback(
    async (id: string, operator?: string) => {
      await finishedGoods.ship(id, operator);
      await load();
    },
    [finishedGoods, load],
  );

  const hasActiveFilters =
    query.trim().length > 0 ||
    status !== "all" ||
    Object.values(filters).some((value) => value !== "");

  return {
    loading,
    rolls: filtered,
    totalCount: rolls.length,
    materialsById,
    query,
    setQuery,
    status,
    setStatus,
    statusCounts,
    filters,
    setFilter,
    resetFilters,
    hasActiveFilters,
    options,
    analytics,
    machineLabel: (machine: string) => machineTitle(machine as never),
    reserve,
    releaseReservation,
    ship,
    reload: load,
  };
}

/**
 * ViewModel for a single finished roll's detail card. Loads the roll and its
 * history, and exposes the same movement actions as the list.
 */
export function useFinishedRollViewModel(rollId: string) {
  const { finishedGoods } = useServices();
  const [loading, setLoading] = useState(true);
  const [roll, setRoll] = useState<FinishedRoll | null>(null);

  const load = useCallback(async () => {
    const found = await finishedGoods.getById(rollId);
    setRoll(found ?? null);
  }, [finishedGoods, rollId]);

  useEffect(() => {
    let active = true;
    void (async () => {
      await load();
      if (active) {
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [load]);

  const reserve = useCallback(
    async (operator?: string) => {
      await finishedGoods.reserve(rollId, operator);
      await load();
    },
    [finishedGoods, rollId, load],
  );
  const releaseReservation = useCallback(
    async (operator?: string) => {
      await finishedGoods.releaseReservation(rollId, operator);
      await load();
    },
    [finishedGoods, rollId, load],
  );
  const ship = useCallback(
    async (operator?: string) => {
      await finishedGoods.ship(rollId, operator);
      await load();
    },
    [finishedGoods, rollId, load],
  );

  return { loading, roll, reserve, releaseReservation, ship, reload: load };
}
