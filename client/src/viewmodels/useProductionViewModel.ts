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
import { AuditAction } from "@/admin";
import { makeId } from "@/utilities/id";

const USEFUL_WIDTH_TRIM_MM = 20;

/** Message shown when the selected Jumbo cannot cover the order. */
export const NOT_ENOUGH_MATERIAL_MESSAGE =
  "Текущего Джамбо недостаточно для завершения заказа. Подключите следующий Джамбо, чтобы продолжить.";

export interface ProductionParams {
  rollWidthMm: number;
  rollLengthM: number;
  orderRolls: number;
  additionalWidthMm?: number;
  additionalDestination: RollDestination;
}

/** Outcome status of the live plan for the selected Jumbo. */
export type ProductionPlanStatus = "idle" | "ok" | "insufficient" | "error";

/** One Jumbo's contribution to a multi-Jumbo order chain. */
export interface ChainStep {
  jumboStockNumber: string;
  materialCode: string;
  /** Main (order) rolls produced on this Jumbo. */
  producedMainRolls: number;
  additionalRolls: number;
  /** Remainder left on this Jumbo after its part of the order (preserved). */
  remainderAfterM: number;
  /** Length consumed from this Jumbo for the order. */
  consumedM: number;
  usefulAreaM2: number;
  wasteAreaM2: number;
  wastePercent: number;
}

/** Roll-up shown once a (possibly multi-Jumbo) order is finished. */
export interface OrderSummary {
  orderNumber: string;
  customer: string;
  jumbosUsed: number;
  totalMainRolls: number;
  targetRolls: number;
  totalConsumedM: number;
  totalUsefulAreaM2: number;
  totalWasteAreaM2: number;
  steps: ChainStep[];
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function isInsufficientMessage(message: string): boolean {
  return message.includes("Недостаточ") || message.toLowerCase().includes("длин");
}

function buildStep(jumbo: Jumbo, plan: CalcResult, outcome: CompleteCalculationOutcome): ChainStep {
  return {
    jumboStockNumber: jumbo.stockNumber,
    materialCode: jumbo.materialCode,
    producedMainRolls: plan.total_main_rolls,
    additionalRolls: plan.total_additional_rolls,
    remainderAfterM: outcome.remainderAfterM,
    consumedM: round1(Math.max(0, jumbo.currentRemainderM - outcome.remainderAfterM)),
    usefulAreaM2: plan.useful_area_m2,
    wasteAreaM2: plan.waste_area_m2,
    wastePercent: plan.waste_percent,
  };
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

  // ── Multi-Jumbo order chain ──────────────────────────────────────────────
  /** True once the order spans more than one Jumbo. */
  chainActive: boolean;
  /** Completed steps of the current order chain (finished Jumbos). */
  chainSteps: ChainStep[];
  /** Main rolls produced for the order so far (across finished Jumbos). */
  producedMain: number;
  /** Original order quantity for the running chain. */
  orderTotalRolls: number | null;
  /** Rolls still to produce for the order. */
  remainingRolls: number | null;
  /** Jumbos eligible to continue the order (excludes used ones and current). */
  eligibleForContinue: Jumbo[];
  /** Whether the order can be continued on another Jumbo right now. */
  canContinue: boolean;
  continuing: boolean;
  /** Finish the current Jumbo's part and continue the order on `next`. */
  continueOnNewJumbo: (next: Jumbo) => Promise<void>;
  /** Summary shown after the whole order is completed. */
  orderSummary: OrderSummary | null;
}

/**
 * ViewModel for the production calculation.
 *
 * Gathers the order info, the operator-selected Jumbo and the roll parameters,
 * derives the live plan with the unchanged calculation engine, validates
 * production preconditions, and commits results to the warehouse via
 * {@link WarehouseService}.
 *
 * When a single Jumbo cannot cover the order, the ViewModel drives a **Jumbo
 * chain**: it books what the current Jumbo produced (a partial run through the
 * unchanged `completeCalculation`), preserves that Jumbo's remainder, carries
 * the outstanding quantity to the next Jumbo, and repeats — for any number of
 * Jumbos — without the operator re-entering the order. The engine, the cutting
 * logic and the warehouse service are reused verbatim; only the order-execution
 * scenario is extended, plus a `chainId` stamped on each session to link them.
 */
export function useProductionViewModel(): ProductionViewModel {
  const { calculation, jumbos, materials, warehouse, settings, admin, cuttingSessions } =
    useServices();

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

  // Chain state.
  const [chainId, setChainId] = useState<string | null>(null);
  const [chainSteps, setChainSteps] = useState<ChainStep[]>([]);
  const [producedMain, setProducedMain] = useState(0);
  const [orderTotalRolls, setOrderTotalRolls] = useState<number | null>(null);
  const [chainJumboIds, setChainJumboIds] = useState<string[]>([]);
  const [continuing, setContinuing] = useState(false);
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);

  const loadAvailable = useCallback(async () => {
    const [jumboList, materialList] = await Promise.all([jumbos.getAll(), materials.getAll()]);
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

  const updateOrder = useCallback(<K extends keyof OrderInfo>(key: K, value: OrderInfo[K]) => {
    setOrder((previous) => ({ ...previous, [key]: value }));
  }, []);

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

  const eligibleForContinue = useMemo(
    () =>
      available.filter(
        (jumbo) => jumbo.id !== selectedJumbo?.id && !chainJumboIds.includes(jumbo.id),
      ),
    [available, selectedJumbo, chainJumboIds],
  );

  const canContinue =
    planStatus === "insufficient" && orderValid && jumboValid && eligibleForContinue.length > 0;

  const remainingRolls =
    orderTotalRolls !== null ? Math.max(0, orderTotalRolls - producedMain) : null;

  const recordAudit = useCallback(
    async (jumbo: Jumbo, done: CalcResult, note: string) => {
      await admin.audit.record(AuditAction.calculation, {
        entity: "Джамб",
        entityId: jumbo.stockNumber,
        user: order.operator,
        details: `Заказ ${order.orderNumber || "без номера"}${note}: ${done.total_rolls} рул.`,
      });
    },
    [admin, order.operator, order.orderNumber],
  );

  const continueOnNewJumbo = useCallback(
    async (next: Jumbo) => {
      if (!selectedJumbo || !orderValid || !jumboValid) {
        return;
      }
      setContinuing(true);
      try {
        const activeChainId = chainId ?? makeId();
        const total = orderTotalRolls ?? params.orderRolls;
        let produced = producedMain;
        const steps = [...chainSteps];

        // Book what the current Jumbo actually produced (a partial run through
        // the unchanged warehouse service). Its remainder is preserved on the
        // record. Skip if it cannot make even one order roll.
        if (input && plan && plan.total_main_rolls > 0) {
          const done = await warehouse.completeCalculation({
            jumboId: selectedJumbo.id,
            order,
            input,
            result: plan,
            additionalDestination: params.additionalDestination,
          });
          if (done) {
            const index = steps.length + 1;
            await cuttingSessions.save({ ...done.session, chainId: activeChainId, chainIndex: index });
            steps.push(buildStep(selectedJumbo, plan, done));
            produced += plan.total_main_rolls;
            await recordAudit(selectedJumbo, plan, ` (Джамб ${index})`);
          }
        }

        setChainId(activeChainId);
        setChainSteps(steps);
        setProducedMain(produced);
        setOrderTotalRolls(total);
        setChainJumboIds((ids) => [...ids, selectedJumbo.id]);

        // Carry the outstanding quantity to the next Jumbo — no re-entry needed.
        const remaining = Math.max(1, total - produced);
        setParams((p) => ({ ...p, orderRolls: remaining }));
        setSelectedJumbo(next);
        setOutcome(null);
        setOrderSummary(null);
        await loadAvailable();
      } finally {
        setContinuing(false);
      }
    },
    [
      selectedJumbo,
      orderValid,
      jumboValid,
      chainId,
      orderTotalRolls,
      params,
      producedMain,
      chainSteps,
      input,
      plan,
      warehouse,
      order,
      cuttingSessions,
      recordAudit,
      loadAvailable,
    ],
  );

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
        if (chainId) {
          // Final Jumbo of a chain: link the session and build the summary.
          const index = chainSteps.length + 1;
          await cuttingSessions.save({ ...result.session, chainId, chainIndex: index });
          const steps = [...chainSteps, buildStep(selectedJumbo, plan, result)];
          setOrderSummary({
            orderNumber: order.orderNumber,
            customer: order.customer,
            jumbosUsed: steps.length,
            totalMainRolls: producedMain + plan.total_main_rolls,
            targetRolls: orderTotalRolls ?? producedMain + plan.total_main_rolls,
            totalConsumedM: round1(steps.reduce((s, x) => s + x.consumedM, 0)),
            totalUsefulAreaM2: round1(steps.reduce((s, x) => s + x.usefulAreaM2, 0)),
            totalWasteAreaM2: round1(steps.reduce((s, x) => s + x.wasteAreaM2, 0)),
            steps,
          });
          setChainId(null);
          setChainSteps([]);
          setProducedMain(0);
          setOrderTotalRolls(null);
          setChainJumboIds([]);
        } else {
          setOrderSummary(null);
        }
        setOutcome(result);
        setSelectedJumbo(null);
        await recordAudit(selectedJumbo, plan, "");
        await loadAvailable();
      }
      return result;
    } finally {
      setExecuting(false);
    }
  }, [
    selectedJumbo,
    input,
    plan,
    canExecute,
    warehouse,
    order,
    params,
    chainId,
    chainSteps,
    producedMain,
    orderTotalRolls,
    cuttingSessions,
    recordAudit,
    loadAvailable,
  ]);

  const reset = useCallback(() => {
    setSelectedJumbo(null);
    setOutcome(null);
    setChainId(null);
    setChainSteps([]);
    setProducedMain(0);
    setOrderTotalRolls(null);
    setChainJumboIds([]);
    setOrderSummary(null);
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
    chainActive: chainId !== null,
    chainSteps,
    producedMain,
    orderTotalRolls,
    remainingRolls,
    eligibleForContinue,
    canContinue,
    continuing,
    continueOnNewJumbo,
    orderSummary,
  };
}
