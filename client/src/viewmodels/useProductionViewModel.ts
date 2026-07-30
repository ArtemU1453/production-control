import { useCallback, useEffect, useMemo, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import {
  JumboStatus,
  Machine,
  RollDestination,
  type CuttingOrderInput,
  type Jumbo,
  type Material,
  type OrderInfo,
} from "@/models";
import type { CalcResult, CompleteCalculationOutcome } from "@/services";

const USEFUL_WIDTH_TRIM_MM = 20;

/** Message shown when the selected Jumbo cannot cover the order. */
export const NOT_ENOUGH_MATERIAL_MESSAGE =
  "Недостаточно материала для выполнения заказа. Завершите текущий Джамб и выберите новый.";

export interface ProductionParams {
  rollWidthMm: number;
  rollLengthM: number;
  orderRolls: number;
  additionalWidthMm?: number;
  additionalDestination: RollDestination;
}

/** Outcome status of the live plan for the selected Jumbo. */
export type ProductionPlanStatus = "idle" | "ok" | "insufficient" | "error";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

function isInsufficientMessage(message: string): boolean {
  return message.includes("Недостаточ") || message.toLowerCase().includes("длин");
}

interface ProductionViewModel {
  loading: boolean;
  order: OrderInfo;
  updateOrder: <K extends keyof OrderInfo>(key: K, value: OrderInfo[K]) => void;
  availableJumbos: Jumbo[];
  materialsById: Map<string, Material>;
  selectedJumbo: Jumbo | null;
  selectJumbo: (jumbo: Jumbo) => void;
  params: ProductionParams;
  updateParam: <K extends keyof ProductionParams>(key: K, value: ProductionParams[K]) => void;
  plan: CalcResult | null;
  planStatus: ProductionPlanStatus;
  planError: string | null;
  orderValid: boolean;
  jumboValid: boolean;
  canExecute: boolean;
  executing: boolean;
  outcome: CompleteCalculationOutcome | null;
  execute: () => Promise<CompleteCalculationOutcome | undefined>;
  reset: () => void;
}

/**
 * ViewModel for the production calculation. It gathers the order info, the
 * operator-selected Jumbo and the roll parameters, derives the live plan with
 * the unchanged calculation engine (Jumbo width and current remainder feed the
 * material width and available length), validates production preconditions, and
 * commits the result to the warehouse via {@link WarehouseService}.
 */
export function useProductionViewModel(): ProductionViewModel {
  const { calculation, jumbos, materials, warehouse, settings } = useServices();

  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState<Jumbo[]>([]);
  const [materialsById, setMaterialsById] = useState<Map<string, Material>>(new Map());
  const [selectedJumbo, setSelectedJumbo] = useState<Jumbo | null>(null);
  const [order, setOrder] = useState<OrderInfo>({
    date: todayIsoDate(),
    time: currentTime(),
    customer: "",
    orderNumber: "",
    operator: "",
    machine: Machine.machine1,
    comment: "",
  });
  const [params, setParams] = useState<ProductionParams>({
    rollWidthMm: 104,
    rollLengthM: 300,
    orderRolls: 50,
    additionalWidthMm: undefined,
    additionalDestination: RollDestination.order,
  });
  const [executing, setExecuting] = useState(false);
  const [outcome, setOutcome] = useState<CompleteCalculationOutcome | null>(null);

  const loadAvailable = useCallback(async () => {
    const [jumboList, materialList] = await Promise.all([
      jumbos.getAll(),
      materials.getAll(),
    ]);
    setAvailable(
      jumboList.filter(
        (jumbo) =>
          jumbo.currentRemainderM > 0 &&
          (jumbo.status === JumboStatus.onStock || jumbo.status === JumboStatus.inWork),
      ),
    );
    setMaterialsById(new Map(materialList.map((material) => [material.id, material])));
  }, [jumbos, materials]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const current = await settings.load();
      if (!active) {
        return;
      }
      setOrder((previous) => ({ ...previous, operator: current.operator }));
      await loadAvailable();
      if (active) {
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [settings, loadAvailable]);

  const updateOrder = useCallback(
    <K extends keyof OrderInfo>(key: K, value: OrderInfo[K]) => {
      setOrder((previous) => ({ ...previous, [key]: value }));
    },
    [],
  );

  const updateParam = useCallback(
    <K extends keyof ProductionParams>(key: K, value: ProductionParams[K]) => {
      setParams((previous) => ({ ...previous, [key]: value }));
    },
    [],
  );

  const selectJumbo = useCallback((jumbo: Jumbo) => {
    setSelectedJumbo(jumbo);
    setOutcome(null);
  }, []);

  const input = useMemo<CuttingOrderInput | null>(() => {
    if (!selectedJumbo) {
      return null;
    }
    return {
      materialWidthMm: selectedJumbo.widthMm,
      usefulWidthMm: selectedJumbo.widthMm - USEFUL_WIDTH_TRIM_MM,
      rollWidthMm: params.rollWidthMm,
      rollLengthM: params.rollLengthM,
      bigRollLengthM: selectedJumbo.currentRemainderM,
      orderRolls: params.orderRolls,
      additionalWidthMm: params.additionalWidthMm,
    };
  }, [selectedJumbo, params]);

  const { plan, planStatus, planError } = useMemo<{
    plan: CalcResult | null;
    planStatus: ProductionPlanStatus;
    planError: string | null;
  }>(() => {
    if (!input) {
      return { plan: null, planStatus: "idle", planError: null };
    }
    if (params.rollWidthMm <= 0 || params.rollLengthM <= 0 || params.orderRolls <= 0) {
      return { plan: null, planStatus: "idle", planError: null };
    }
    try {
      const result = calculation.calculate(input);
      if (result.shortage_rolls > 0) {
        return { plan: result, planStatus: "insufficient", planError: NOT_ENOUGH_MATERIAL_MESSAGE };
      }
      return { plan: result, planStatus: "ok", planError: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ошибка расчёта";
      if (isInsufficientMessage(message)) {
        return { plan: null, planStatus: "insufficient", planError: NOT_ENOUGH_MATERIAL_MESSAGE };
      }
      return { plan: null, planStatus: "error", planError: message };
    }
  }, [input, params, calculation]);

  const orderValid =
    order.customer.trim().length > 0 &&
    order.orderNumber.trim().length > 0 &&
    order.operator.trim().length > 0;

  const jumboValid =
    selectedJumbo !== null &&
    selectedJumbo.currentRemainderM > 0 &&
    selectedJumbo.status !== JumboStatus.toWriteOff;

  const canExecute = planStatus === "ok" && plan !== null && orderValid && jumboValid;

  const execute = useCallback(async (): Promise<CompleteCalculationOutcome | undefined> => {
    if (!selectedJumbo || !input || !plan || !canExecute) {
      return undefined;
    }
    setExecuting(true);
    try {
      const result = await warehouse.completeCalculation({
        jumboId: selectedJumbo.id,
        order,
        input,
        result: plan,
        additionalDestination: params.additionalDestination,
      });
      if (result) {
        setOutcome(result);
        setSelectedJumbo(null);
        await loadAvailable();
      }
      return result;
    } finally {
      setExecuting(false);
    }
  }, [selectedJumbo, input, plan, canExecute, warehouse, order, params, loadAvailable]);

  const reset = useCallback(() => {
    setSelectedJumbo(null);
    setOutcome(null);
  }, []);

  return {
    loading,
    order,
    updateOrder,
    availableJumbos: available,
    materialsById,
    selectedJumbo,
    selectJumbo,
    params,
    updateParam,
    plan,
    planStatus,
    planError,
    orderValid,
    jumboValid,
    canExecute,
    executing,
    outcome,
    execute,
    reset,
  };
}
