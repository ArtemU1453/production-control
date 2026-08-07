import { useCallback, useEffect, useMemo, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import {
  Coating,
  FinishedRollStatus,
  type FinishedRoll,
  type Material,
} from "@/models";
import type { ManualFinishedRollInput } from "@/services";

/** Status filter — a concrete status or "all". */
export type FinishedGoodsStatusFilter = "all" | FinishedRollStatus;
/** Coating (direction) filter. */
export type FinishedGoodsDirectionFilter = "all" | Coating;
/** Page size options for the table. */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

/**
 * One aggregated table row: identical rolls (same material + width + winding +
 * status) collapsed into a single record, with IN and OUT counted separately.
 */
export interface FinishedGoodsRow {
  key: string;
  materialId: string;
  materialCode: string;
  widthMm: number;
  lengthM: number;
  status: FinishedRollStatus;
  inCount: number;
  outCount: number;
  totalCount: number;
  areaM2: number;
  comment: string;
  arrivalDate: string;
  /** Ids of the underlying per-roll records (for edit / delete). */
  rollIds: string[];
}

/** A material chip in the horizontal selector. */
export interface MaterialChip {
  materialId: string;
  code: string;
  count: number;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function rowArea(widthMm: number, lengthM: number, count: number): number {
  return (widthMm / 1000) * lengthM * count;
}

/**
 * ViewModel for the finished-goods warehouse (Склад готовых рулонов).
 *
 * Presents an aggregated table over the per-roll {@link FinishedRoll} storage:
 * rolls that share material + width + winding + status are collapsed into one
 * row, with IN/OUT counted in separate columns and the area summed. Provides the
 * material-chip selector, instant search, direction/status filters, pagination,
 * and manual create / edit / delete. Rolls arrive automatically from production;
 * this layer never changes the cutting or warehouse logic.
 */
export function useFinishedGoodsViewModel() {
  const { finishedGoods, materials } = useServices();

  const [loading, setLoading] = useState(true);
  const [rolls, setRolls] = useState<FinishedRoll[]>([]);
  const [materialsById, setMaterialsById] = useState<Map<string, Material>>(new Map());
  const [query, setQuery] = useState("");
  const [materialId, setMaterialId] = useState(""); // "" = все материалы
  const [direction, setDirection] = useState<FinishedGoodsDirectionFilter>("all");
  const [status, setStatus] = useState<FinishedGoodsStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const load = useCallback(async () => {
    const [rollList, materialList] = await Promise.all([finishedGoods.list(), materials.getAll()]);
    setRolls(rollList);
    setMaterialsById(new Map(materialList.map((material) => [material.id, material])));
  }, [finishedGoods, materials]);

  useEffect(() => {
    let active = true;
    void (async () => {
      await load();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [load]);

  // Material chips — total roll count per material (across the whole warehouse).
  const materialChips = useMemo<MaterialChip[]>(() => {
    const counts = new Map<string, { code: string; count: number }>();
    for (const roll of rolls) {
      const entry = counts.get(roll.materialId) ?? { code: roll.materialCode, count: 0 };
      entry.count += roll.count;
      counts.set(roll.materialId, entry);
    }
    return Array.from(counts.entries())
      .map(([id, { code, count }]) => ({ materialId: id, code, count }))
      .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
  }, [rolls]);

  const totalRollCount = useMemo(() => rolls.reduce((sum, roll) => sum + roll.count, 0), [rolls]);

  // Rolls passing the search / material / direction / status filters.
  const filteredRolls = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rolls.filter((roll) => {
      if (materialId && roll.materialId !== materialId) return false;
      if (direction !== "all" && (roll.coating ?? Coating.out) !== direction) return false;
      if (status !== "all" && roll.status !== status) return false;
      if (needle) {
        const haystack = [
          String(roll.widthMm),
          String(roll.lengthM),
          roll.materialCode,
          roll.comment ?? "",
          roll.orderNumber,
          roll.number,
          roll.jumboStockNumber,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [rolls, query, materialId, direction, status]);

  // Aggregate the filtered rolls into table rows.
  const rows = useMemo<FinishedGoodsRow[]>(() => {
    const groups = new Map<string, FinishedGoodsRow>();
    for (const roll of filteredRolls) {
      const key = `${roll.materialId}|${roll.widthMm}|${roll.lengthM}|${roll.status}`;
      let row = groups.get(key);
      if (!row) {
        row = {
          key,
          materialId: roll.materialId,
          materialCode: roll.materialCode,
          widthMm: roll.widthMm,
          lengthM: roll.lengthM,
          status: roll.status,
          inCount: 0,
          outCount: 0,
          totalCount: 0,
          areaM2: 0,
          comment: roll.comment ?? "",
          arrivalDate: roll.producedAt,
          rollIds: [],
        };
        groups.set(key, row);
      }
      if ((roll.coating ?? Coating.out) === Coating.in) row.inCount += roll.count;
      else row.outCount += roll.count;
      row.totalCount += roll.count;
      row.areaM2 += rowArea(roll.widthMm, roll.lengthM, roll.count);
      row.rollIds.push(roll.id);
      if (!row.comment && roll.comment) row.comment = roll.comment;
      if (roll.producedAt < row.arrivalDate) row.arrivalDate = roll.producedAt;
    }
    return Array.from(groups.values())
      .map((row) => ({ ...row, areaM2: round1(row.areaM2) }))
      .sort((a, b) => b.arrivalDate.localeCompare(a.arrivalDate) || a.widthMm - b.widthMm);
  }, [filteredRolls]);

  // Pagination (clamped so the page is always valid as filters change).
  const totalRows = rows.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = useMemo(
    () => rows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [rows, safePage, pageSize],
  );
  const rangeStart = totalRows === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, totalRows);

  // Reset to the first page whenever the result set changes.
  useEffect(() => {
    setPage(1);
  }, [query, materialId, direction, status, pageSize]);

  const hasActiveFilters =
    query.trim().length > 0 || materialId !== "" || direction !== "all" || status !== "all";
  const resetFilters = useCallback(() => {
    setQuery("");
    setMaterialId("");
    setDirection("all");
    setStatus("all");
  }, []);

  const createManual = useCallback(
    async (input: ManualFinishedRollInput) => {
      await finishedGoods.create(input);
      await load();
    },
    [finishedGoods, load],
  );
  const editComment = useCallback(
    async (rollIds: string[], comment: string) => {
      for (const id of rollIds) {
        await finishedGoods.updateComment(id, comment);
      }
      await load();
    },
    [finishedGoods, load],
  );
  const removeRow = useCallback(
    async (rollIds: string[]) => {
      await finishedGoods.remove(rollIds);
      await load();
    },
    [finishedGoods, load],
  );

  return {
    loading,
    // data
    rows: pageRows,
    totalRows,
    totalRollCount,
    materialChips,
    materialsById,
    // search / filters
    query,
    setQuery,
    materialId,
    setMaterialId,
    direction,
    setDirection,
    status,
    setStatus,
    hasActiveFilters,
    resetFilters,
    // pagination
    page: safePage,
    pageCount,
    pageSize,
    setPage,
    setPageSize,
    rangeStart,
    rangeEnd,
    // actions
    createManual,
    editComment,
    removeRow,
    reload: load,
  };
}

/**
 * ViewModel for a single finished roll's detail card. Loads the roll and its
 * history, and exposes the movement actions.
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
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [load]);

  const reserve = useCallback(async (operator?: string) => { await finishedGoods.reserve(rollId, operator); await load(); }, [finishedGoods, rollId, load]);
  const releaseReservation = useCallback(async (operator?: string) => { await finishedGoods.releaseReservation(rollId, operator); await load(); }, [finishedGoods, rollId, load]);
  const ship = useCallback(async (operator?: string) => { await finishedGoods.ship(rollId, operator); await load(); }, [finishedGoods, rollId, load]);
  const writeOff = useCallback(async (operator?: string, note?: string) => { await finishedGoods.writeOff(rollId, operator, note); await load(); }, [finishedGoods, rollId, load]);
  const relocate = useCallback(async (location: string, operator?: string) => { await finishedGoods.relocate(rollId, location, operator); await load(); }, [finishedGoods, rollId, load]);
  const updateComment = useCallback(async (comment: string, operator?: string) => { await finishedGoods.updateComment(rollId, comment, operator); await load(); }, [finishedGoods, rollId, load]);

  return { loading, roll, reserve, releaseReservation, ship, writeOff, relocate, updateComment, reload: load };
}
