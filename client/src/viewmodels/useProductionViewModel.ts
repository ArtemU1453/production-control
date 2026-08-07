import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import { storageKeys } from "@/storage/StorageKeys";
import {
  DEFAULT_COATING,
  JumboStatus,
  Machine,
  MaterialStatus,
  RollDestination,
  type CuttingOrderInput,
  type Jumbo,
  type Material,
  type OrderInfo,
} from "@/models";
import type { CalcResult, CompleteCalculationOutcome } from "@/services";
import { AuditAction } from "@/admin";
import { makeId } from "@/utilities/id";
import { computeTechScrap } from "@/core/production/techScrap";

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

/**
 * Blank roll parameters for a new production task. The user-entered fields
 * (ширина / длина / количество) always start empty — nothing is carried over
 * from a previous order, cached, or restored. Only the additional-rolls
 * destination keeps its neutral default (a toggle, not a numeric value).
 */
function emptyParams(): ProductionParams {
  return {
    rollWidthMm: 0,
    rollLengthM: 0,
    orderRolls: 0,
    additionalWidthMm: undefined,
    additionalDestination: RollDestination.order,
  };
}

/** Outcome status of the live plan for the selected Jumbo. */
export type ProductionPlanStatus = "idle" | "ok" | "insufficient" | "error";

/** Lifecycle phase of the production run (workflow only — not persisted). */
export type OrderPhase = "setup" | "running" | "paused" | "completed";

/** A production-journal entry recorded while an order is in work. */
export type ProductionLogKind =
  | "defect"
  | "tech"
  | "stop"
  | "comment"
  | "start"
  | "exhausted"
  | "connect"
  | "continue"
  | "pause"
  | "resume"
  | "finish";
export interface ProductionLogEntry {
  id: string;
  kind: ProductionLogKind;
  at: string;
  note?: string;
  count?: number;
  /** Причина (брака / отхода). */
  reason?: string;
  /** Ширина, мм (для брака). */
  widthMm?: number;
  /** Намотка бракованного рулона, м. */
  windingM?: number;
  /** Метраж, списанный этой операцией (брак или тех. отход), м. */
  meters?: number;
  /** Площадь, м² (для брака). */
  areaM2?: number;
  /** Оператор, зафиксировавший операцию. */
  operator?: string;
  /** Складской номер Джамбо, к которому привязана запись (брак/отход/списание
   *  относятся именно к активному Джамбо, а не к заказу). */
  jumboStockNumber?: string;
}

/** Detailed defect record entered by the operator during production. */
export interface DefectInput {
  /** Количество бракованных рулонов. */
  count: number;
  /** Причина брака. */
  reason?: string;
  /** Ширина рулона, мм. */
  widthMm?: number;
  /** Намотка одного рулона, м. */
  windingM?: number;
  /** Комментарий. */
  comment?: string;
}


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
  cycles: number;
}

/** Final production summary shown once an order is completed. */
export interface CompletionSummary {
  orderNumber: string;
  customer: string;
  jumbosUsed: number;
  producedMainRolls: number;
  goodRolls: number;
  targetRolls: number;
  /** Годных рулонов, переданных по заказу (= min(годных, заказ)). */
  orderDeliveredRolls: number;
  /** Излишек годных рулонов, оприходованный на склад (= max(0, годных − заказ)). */
  warehouseSurplusRolls: number;
  defects: number;
  usedMaterialM: number;
  remainderM: number;
  usefulAreaM2: number;
  totalWasteAreaM2: number;
  utilizationPercent: number;
  cycles: number;
  durationMs: number;
  steps: ChainStep[];
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

/**
 * Serializable snapshot of an in-progress production run. Persisted to the Store
 * so an active session survives navigation between tabs and a full page reload.
 * Only the raw workflow state is stored — derived values (plan, KPIs) are
 * recomputed identically from the restored inputs.
 */
interface ActiveProductionSnapshot {
  order: OrderInfo;
  materialId: string;
  selectedJumbo: Jumbo | null;
  params: ProductionParams;
  outcome: CompleteCalculationOutcome | null;
  chainId: string | null;
  chainSteps: ChainStep[];
  producedMain: number;
  orderTotalRolls: number | null;
  chainJumboIds: string[];
  orderSummary: OrderSummary | null;
  phase: OrderPhase;
  startedAt: string | null;
  productionLog: ProductionLogEntry[];
  busyMachines: Machine[];
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

/** Auto-generated order number (the manual "Заказ" field was removed — the task
 *  now starts from the material). Unique to the second. */
function generateOrderNumber(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `ORD-${d.getFullYear().toString().slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
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
    cycles: plan.cycles_used,
  };
}

/** Machine status labels (workflow view — derived, not persisted). */
export const MACHINE_STATUS = {
  free: "Свободен",
  busy: "Выполняет заказ",
  maintenance: "Техобслуживание",
  inactive: "Неактивен",
} as const;

const BUSY_MACHINE_MESSAGE =
  "Станок выполняет активный заказ. Сначала завершите текущий заказ.";

interface ProductionViewModel {
  loading: boolean;
  order: OrderInfo;
  updateOrder: <K extends keyof OrderInfo>(key: K, value: OrderInfo[K]) => void;
  /** Active materials the operator picks from as the first step. */
  materials: Material[];
  /** Selected material — the primary filter for the whole task ("" = none). */
  materialId: string;
  setMaterialId: (id: string) => void;
  /** The selected material record (null until one is chosen). */
  selectedMaterial: Material | null;
  /** Jumbos available for production — filtered to the selected material. */
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

  // ── Production lifecycle ─────────────────────────────────────────────────
  /** Current lifecycle phase of the run. */
  phase: OrderPhase;
  /** Human status label of the order (Создан … Выполнен). */
  orderStatusLabel: string;
  /** True while the order is in work (running or paused) — inputs are locked. */
  locked: boolean;
  /** The plan is valid and the order can start. */
  canStart: boolean;
  /** ISO timestamp when production started (fixed at start). */
  startedAt: string | null;
  startProduction: () => void;
  pauseProduction: () => void;
  resumeProduction: () => void;
  /** Commit the run: books rolls/consumption via the warehouse, frees the
   *  machine, moves to "Выполнен" and builds the final summary. */
  finishProduction: () => Promise<CompleteCalculationOutcome | undefined>;
  finishing: boolean;
  /** Start a fresh order after one is completed. */
  newOrder: () => void;
  /** Отменить производство: сбрасывает активную сессию и очищает её снимок. */
  cancelProduction: () => void;
  /** In-session production journal (defects, scrap, stops, notes). */
  productionLog: ProductionLogEntry[];
  addDefect: (detail: DefectInput) => void;
  addStop: (note?: string) => void;
  addNote: (note: string) => void;
  /** Брак за весь заказ, рул. (для итогового отчёта). */
  defectCount: number;
  /** Суммарная площадь брака за весь заказ, м². */
  defectAreaM2: number;
  /** Брак текущего (активного) Джамбо, рул. */
  activeDefectCount: number;
  /** Площадь брака текущего Джамбо, м². */
  activeDefectAreaM2: number;
  /** Технологический отход заказа, м — рассчитывается системой автоматически
   *  (запуск, настройка, замены Джамбо, завершение). Не вводится вручную. */
  techScrapM: number;
  /** Живой остаток текущего Джамбо за вычетом его брака, м (только отображение —
   *  не мутирует запись Джамбо и не влияет на расчёт/списание). */
  liveRemainderM: number;
  /** Final summary shown in the "completed" phase. */
  completionSummary: CompletionSummary | null;
  /** Status label for a machine (свободен / выполняет заказ …). */
  machineStatusLabel: (machine: Machine) => string;
  machineBusy: (machine: Machine) => boolean;
  /** Message shown if a new order is attempted on a busy machine. */
  busyMachineMessage: string;
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
  const { calculation, jumbos, materials, warehouse, settings, admin, cuttingSessions, finishedGoods, store } =
    useServices();

  // True once the mount-time rehydration has run. Persistence is suppressed
  // until then, so restoring a saved session never races with an empty write.
  const hydrated = useRef(false);

  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState<Jumbo[]>([]);
  const [activeMaterials, setActiveMaterials] = useState<Material[]>([]);
  const [materialId, setMaterialIdState] = useState("");
  const [materialsById, setMaterialsById] = useState<Map<string, Material>>(new Map());
  const [selectedJumbo, setSelectedJumbo] = useState<Jumbo | null>(null);
  const [order, setOrder] = useState<OrderInfo>({
    date: todayIsoDate(),
    time: currentTime(),
    customer: "",
    orderNumber: generateOrderNumber(),
    operator: "",
    machine: Machine.machine1,
    coating: DEFAULT_COATING,
    comment: "",
  });
  const [params, setParams] = useState<ProductionParams>(emptyParams);
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

  // Lifecycle state (workflow only — nothing here is persisted to a model).
  const [phase, setPhase] = useState<OrderPhase>("setup");
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [productionLog, setProductionLog] = useState<ProductionLogEntry[]>([]);
  const [busyMachines, setBusyMachines] = useState<Machine[]>([]);
  const [completionSummary, setCompletionSummary] = useState<CompletionSummary | null>(null);

  const loadAvailable = useCallback(async () => {
    const [jumboList, materialList] = await Promise.all([jumbos.getAll(), materials.getAll()]);
    setAvailable(
      jumboList.filter(
        (jumbo) =>
          jumbo.currentRemainderM > 0 &&
          (jumbo.status === JumboStatus.onStock || jumbo.status === JumboStatus.inWork),
      ),
    );
    setActiveMaterials(materialList.filter((material) => material.status === MaterialStatus.active));
    setMaterialsById(new Map(materialList.map((material) => [material.id, material])));
  }, [jumbos, materials]);

  // Selecting a material is the first step and the primary filter — changing it
  // clears the current Jumbo, chain and roll parameters.
  const setMaterialId = useCallback((id: string) => {
    setMaterialIdState(id);
    setSelectedJumbo(null);
    setOutcome(null);
    setChainId(null);
    setChainSteps([]);
    setProducedMain(0);
    setOrderTotalRolls(null);
    setChainJumboIds([]);
    setOrderSummary(null);
    setParams(emptyParams());
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const current = await settings.load();
      if (!active) {
        return;
      }
      await loadAvailable();
      if (!active) {
        return;
      }
      // Restore an in-progress run (survives tab navigation and page reload).
      // Only running/paused sessions are persisted, so a restored snapshot always
      // drops the operator straight back into the active run.
      const snapshot = await store.read<ActiveProductionSnapshot>(storageKeys.activeProduction);
      if (snapshot && (snapshot.phase === "running" || snapshot.phase === "paused")) {
        setOrder(snapshot.order);
        setMaterialIdState(snapshot.materialId);
        setSelectedJumbo(snapshot.selectedJumbo);
        setParams(snapshot.params);
        setOutcome(snapshot.outcome);
        setChainId(snapshot.chainId);
        setChainSteps(snapshot.chainSteps);
        setProducedMain(snapshot.producedMain);
        setOrderTotalRolls(snapshot.orderTotalRolls);
        setChainJumboIds(snapshot.chainJumboIds);
        setOrderSummary(snapshot.orderSummary);
        setStartedAt(snapshot.startedAt);
        setProductionLog(snapshot.productionLog);
        setBusyMachines(snapshot.busyMachines);
        setPhase(snapshot.phase);
      } else {
        // Fresh screen: only seed the default operator from settings.
        setOrder((previous) => ({ ...previous, operator: current.operator }));
      }
      hydrated.current = true;
      if (active) {
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [settings, loadAvailable, store]);

  // Persist the active run on every change so it survives navigation and reload.
  // Only running/paused runs are stored; any other phase (setup / completed)
  // clears the snapshot, so a finished or cancelled run never lingers.
  useEffect(() => {
    if (!hydrated.current) {
      return;
    }
    if (phase === "running" || phase === "paused") {
      const snapshot: ActiveProductionSnapshot = {
        order,
        materialId,
        selectedJumbo,
        params,
        outcome,
        chainId,
        chainSteps,
        producedMain,
        orderTotalRolls,
        chainJumboIds,
        orderSummary,
        phase,
        startedAt,
        productionLog,
        busyMachines,
      };
      void store.write(storageKeys.activeProduction, snapshot);
    } else {
      void store.remove(storageKeys.activeProduction);
    }
  }, [
    store,
    phase,
    order,
    materialId,
    selectedJumbo,
    params,
    outcome,
    chainId,
    chainSteps,
    producedMain,
    orderTotalRolls,
    chainJumboIds,
    orderSummary,
    startedAt,
    productionLog,
    busyMachines,
  ]);

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

  const selectedMaterial = useMemo(
    () => (materialId ? materialsById.get(materialId) ?? null : null),
    [materialsById, materialId],
  );

  // Every Jumbo list is scoped to the selected material — nothing is shown until
  // a material is chosen, and only that material's rolls appear afterwards.
  const availableForMaterial = useMemo(
    () => (materialId ? available.filter((jumbo) => jumbo.materialId === materialId) : []),
    [available, materialId],
  );

  const eligibleForContinue = useMemo(
    () =>
      availableForMaterial.filter(
        (jumbo) => jumbo.id !== selectedJumbo?.id && !chainJumboIds.includes(jumbo.id),
      ),
    [availableForMaterial, selectedJumbo, chainJumboIds],
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
        // Includes defect replacements: the order needs `total` GOOD rolls, so the
        // total main to produce is `total + defects`.
        const defectsSoFar = productionLog
          .filter((entry) => entry.kind === "defect")
          .reduce((sum, entry) => sum + (entry.count ?? 1), 0);
        const remaining = Math.max(1, total + defectsSoFar - produced);
        setParams((p) => ({ ...p, orderRolls: remaining }));
        setSelectedJumbo(next);
        setOutcome(null);
        setOrderSummary(null);
        // Journal: current Jumbo fully used → next connected → production resumes.
        const switchAt = new Date().toISOString();
        const changeScrap = computeTechScrap({ started: true, jumboChanges: 1, finished: false });
        setProductionLog((log) => [
          {
            id: makeId(),
            kind: "continue",
            at: switchAt,
            note: "Продолжено производство",
            operator: order.operator || undefined,
            jumboStockNumber: next.stockNumber,
          },
          // Технический цикл: заправка при замене Джамбо — считается автоматически.
          {
            id: makeId(),
            kind: "tech",
            at: switchAt,
            note: "Заправка при замене Джамбо",
            meters: changeScrap.changesM,
            operator: order.operator || undefined,
            jumboStockNumber: next.stockNumber,
          },
          {
            id: makeId(),
            kind: "connect",
            at: switchAt,
            note: `Джамбо № ${next.stockNumber}`,
            operator: order.operator || undefined,
            jumboStockNumber: next.stockNumber,
          },
          {
            id: makeId(),
            kind: "exhausted",
            at: switchAt,
            note: `Джамбо № ${selectedJumbo.stockNumber}`,
            operator: order.operator || undefined,
            jumboStockNumber: selectedJumbo.stockNumber,
          },
          ...log,
        ]);
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
      productionLog,
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

  // ── Production lifecycle ──────────────────────────────────────────────────
  const locked = phase === "running" || phase === "paused";
  // The current Jumbo can produce at least part of the order (full order when
  // "ok", the first stage of a Jumbo chain when "insufficient").
  const canProduceCurrent =
    plan !== null && plan.total_main_rolls > 0 && (planStatus === "ok" || planStatus === "insufficient");
  // Production may start even if the current Jumbo covers only part of the order;
  // the remainder continues on the next Jumbo in the chain. Finishing the order
  // still requires a fully-covering plan (canExecute).
  const canStart = phase === "setup" && orderValid && jumboValid && canProduceCurrent;
  const activeStock = selectedJumbo?.stockNumber;
  const isActiveEntry = (entry: ProductionLogEntry): boolean =>
    activeStock !== undefined && entry.jumboStockNumber === activeStock;
  const defectEntries = productionLog.filter((entry) => entry.kind === "defect");
  // Order-wide totals (final report).
  const defectCount = defectEntries.reduce((sum, entry) => sum + (entry.count ?? 1), 0);
  const defectAreaM2 = round1(defectEntries.reduce((sum, entry) => sum + (entry.areaM2 ?? 0), 0));
  // Active-Jumbo scope (live operator view — defects never carry between Jumbos).
  const activeDefects = defectEntries.filter(isActiveEntry);
  const activeDefectCount = activeDefects.reduce((sum, entry) => sum + (entry.count ?? 1), 0);
  const activeDefectAreaM2 = round1(activeDefects.reduce((sum, entry) => sum + (entry.areaM2 ?? 0), 0));
  const activeDefectMetersM = round1(activeDefects.reduce((sum, entry) => sum + (entry.meters ?? 0), 0));
  const liveRemainderM = selectedJumbo
    ? Math.max(0, round1(selectedJumbo.currentRemainderM - activeDefectMetersM))
    : 0;

  // Technological scrap is computed automatically from production events —
  // never entered by the operator (see core/production/techScrap).
  const techScrapM = computeTechScrap({
    started: phase !== "setup",
    jumboChanges: chainSteps.length,
    finished: phase === "completed",
  }).totalM;

  const orderStatusLabel = (() => {
    if (phase === "completed") return "Выполнен";
    if (phase === "paused") return "Приостановлен";
    if (phase === "running") return "В работе";
    if (!plan || planStatus !== "ok") return "Создан";
    return canExecute ? "Ожидает запуска" : "Рассчитан";
  })();

  const machineBusy = useCallback(
    (machine: Machine) => busyMachines.includes(machine),
    [busyMachines],
  );
  const machineStatusLabel = useCallback(
    (machine: Machine) => (busyMachines.includes(machine) ? MACHINE_STATUS.busy : MACHINE_STATUS.free),
    [busyMachines],
  );

  const startProduction = useCallback(() => {
    if (!canStart) {
      return;
    }
    setStartedAt(new Date().toISOString());
    setOrderTotalRolls((total) => total ?? params.orderRolls);
    setBusyMachines((machines) =>
      machines.includes(order.machine) ? machines : [...machines, order.machine],
    );
    const at = new Date().toISOString();
    const startupScrap = computeTechScrap({ started: true, jumboChanges: 0, finished: false });
    setProductionLog((log) => [
      // Технический цикл: запуск и заправка линии — считается автоматически.
      {
        id: makeId(),
        kind: "tech",
        at,
        note: "Запуск и настройка линии",
        meters: startupScrap.startupM + startupScrap.setupM,
        operator: order.operator || undefined,
        jumboStockNumber: selectedJumbo?.stockNumber,
      },
      {
        id: makeId(),
        kind: "start",
        at,
        note: selectedJumbo ? `Джамбо № ${selectedJumbo.stockNumber}` : "Запуск линии",
        operator: order.operator || undefined,
        jumboStockNumber: selectedJumbo?.stockNumber,
      },
      ...log,
    ]);
    setPhase("running");
  }, [canStart, params.orderRolls, order.machine, order.operator, selectedJumbo]);

  const pauseProduction = useCallback(() => {
    setPhase((current) => {
      if (current === "running") {
        // Записываем паузу: время и оператор фиксируются в записи журнала.
        setProductionLog((log) => [
          { id: makeId(), kind: "pause", at: new Date().toISOString(), note: "Пауза", operator: order.operator || undefined, jumboStockNumber: selectedJumbo?.stockNumber },
          ...log,
        ]);
        return "paused";
      }
      return current;
    });
  }, [order.operator, selectedJumbo]);
  const resumeProduction = useCallback(() => {
    setPhase((current) => {
      if (current === "paused") {
        setProductionLog((log) => [
          { id: makeId(), kind: "resume", at: new Date().toISOString(), note: "Возобновление", operator: order.operator || undefined, jumboStockNumber: selectedJumbo?.stockNumber },
          ...log,
        ]);
        return "running";
      }
      return current;
    });
  }, [order.operator, selectedJumbo]);

  const pushLog = useCallback(
    (kind: ProductionLogKind, note?: string, count?: number, extra?: Partial<ProductionLogEntry>) => {
      setPhase((current) => {
        if (current === "running" || current === "paused") {
          setProductionLog((log) => [
            {
              id: makeId(),
              kind,
              at: new Date().toISOString(),
              note,
              count,
              operator: order.operator || undefined,
              jumboStockNumber: selectedJumbo?.stockNumber,
              ...extra,
            },
            ...log,
          ]);
        }
        return current;
      });
    },
    [order.operator, selectedJumbo],
  );
  const addDefect = useCallback(
    (detail: DefectInput) => {
      const count = Math.max(1, Math.round(detail.count || 1));
      const widthMm = detail.widthMm ?? selectedJumbo?.widthMm ?? 0;
      const windingM = Math.max(0, detail.windingM ?? 0);
      // Each defective roll consumed `windingM` of the current Jumbo.
      const meters = round1(count * windingM);
      const areaM2 = round1(count * (widthMm / 1000) * windingM);
      pushLog("defect", detail.comment, count, {
        reason: detail.reason,
        widthMm: widthMm || undefined,
        windingM: windingM || undefined,
        meters: meters || undefined,
        areaM2: areaM2 || undefined,
      });
      // Годная продукция = изготовлено − брак: каждый брак нужно возместить, поэтому
      // требуемое количество производства увеличивается на число бракованных рулонов.
      // Если текущего Джамбо не хватит на замену — расчёт станет «insufficient» и
      // недостающее количество будет произведено на следующем Джамбо.
      setParams((previous) => ({ ...previous, orderRolls: previous.orderRolls + count }));
    },
    [pushLog, selectedJumbo],
  );
  const addStop = useCallback((note?: string) => pushLog("stop", note), [pushLog]);
  const addNote = useCallback((note: string) => pushLog("comment", note), [pushLog]);

  const finishProduction = useCallback(async (): Promise<CompleteCalculationOutcome | undefined> => {
    if ((phase !== "running" && phase !== "paused") || !canExecute) {
      return undefined;
    }
    setFinishing(true);
    try {
      const jumboAtFinish = selectedJumbo;
      const planAtFinish = plan;
      const priorSteps = [...chainSteps];
      const priorProduced = producedMain;
      const target = orderTotalRolls ?? params.orderRolls;
      const machine = order.machine;
      const startedSnapshot = startedAt;
      const defects = defectCount;
      const chainIdAtFinish = chainId;
      const logSnapshot = productionLog;

      const result = await execute();
      if (result && jumboAtFinish && planAtFinish) {
        const steps = [...priorSteps, buildStep(jumboAtFinish, planAtFinish, result)];
        const usefulArea = round1(steps.reduce((sum, step) => sum + step.usefulAreaM2, 0));
        const wasteArea = round1(steps.reduce((sum, step) => sum + step.wasteAreaM2, 0));
        const producedRolls = priorProduced + planAtFinish.total_main_rolls;
        // Годная продукция = изготовлено − брак. По заказу передаётся ровно
        // заказанное количество, весь излишек годных — на склад.
        const goodRolls = Math.max(0, producedRolls - defects);
        const orderDeliveredRolls = Math.min(goodRolls, target);
        const warehouseSurplusRolls = Math.max(0, goodRolls - target);
        setCompletionSummary({
          orderNumber: order.orderNumber,
          customer: order.customer,
          jumbosUsed: steps.length,
          producedMainRolls: producedRolls,
          goodRolls,
          targetRolls: target,
          orderDeliveredRolls,
          warehouseSurplusRolls,
          defects,
          usedMaterialM: round1(steps.reduce((sum, step) => sum + step.consumedM, 0)),
          remainderM: result.remainderAfterM,
          usefulAreaM2: usefulArea,
          totalWasteAreaM2: wasteArea,
          utilizationPercent:
            usefulArea + wasteArea > 0 ? round1((usefulArea / (usefulArea + wasteArea)) * 100) : 0,
          cycles: steps.reduce((sum, step) => sum + step.cycles, 0),
          durationMs: startedSnapshot ? Date.now() - new Date(startedSnapshot).getTime() : 0,
          steps,
        });

        // ── Готовая продукция: автоматическое оприходование ────────────────
        // Каждый годный рулон становится отдельной единицей на складе готовых
        // рулонов. Брак сюда не попадает — только изготовлено − брак. При
        // назначении «В заказ» первые `target` закрывают заказ, излишек идёт на
        // склад; при «На склад» все годные рулоны сразу на склад. Джамбо-атрибуция
        // сохраняется по шагам цепочки.
        const defectsByJumbo = new Map<string, number>();
        for (const entry of logSnapshot) {
          if (entry.kind === "defect" && entry.jumboStockNumber) {
            defectsByJumbo.set(
              entry.jumboStockNumber,
              (defectsByJumbo.get(entry.jumboStockNumber) ?? 0) + (entry.count ?? 1),
            );
          }
        }
        const perJumbo = steps.map((step) => ({
          jumboStockNumber: step.jumboStockNumber,
          goodRolls: Math.max(0, step.producedMainRolls - (defectsByJumbo.get(step.jumboStockNumber) ?? 0)),
        }));
        await finishedGoods.materializeFromCompletion({
          orderNumber: order.orderNumber,
          materialId,
          materialCode: jumboAtFinish.materialCode,
          widthMm: params.rollWidthMm,
          lengthM: params.rollLengthM,
          machine,
          operator: order.operator,
          coating: order.coating,
          producedAt: new Date().toISOString(),
          targetRolls: target,
          destination: params.additionalDestination,
          perJumbo,
          sessionId: result.session.id,
          chainId: chainIdAtFinish ?? undefined,
        });

        // Технический цикл завершения (подрезка/переход) + запись о завершении.
        const finishTech = computeTechScrap({ started: true, jumboChanges: priorSteps.length, finished: true });
        setProductionLog((log) => [
          { id: makeId(), kind: "finish", at: new Date().toISOString(), note: "Производство завершено", operator: order.operator || undefined },
          { id: makeId(), kind: "tech", at: new Date().toISOString(), note: "Завершение и переход", meters: finishTech.finishM, operator: order.operator || undefined },
          ...log,
        ]);
        setBusyMachines((machines) => machines.filter((m) => m !== machine));
        setPhase("completed");
      }
      return result;
    } finally {
      setFinishing(false);
    }
  }, [
    phase,
    canExecute,
    selectedJumbo,
    plan,
    chainSteps,
    producedMain,
    orderTotalRolls,
    params.orderRolls,
    params.rollWidthMm,
    params.rollLengthM,
    params.additionalDestination,
    order.machine,
    order.orderNumber,
    order.customer,
    order.operator,
    startedAt,
    defectCount,
    chainId,
    productionLog,
    materialId,
    finishedGoods,
    execute,
  ]);

  const newOrder = useCallback(() => {
    setPhase("setup");
    setStartedAt(null);
    setProductionLog([]);
    setCompletionSummary(null);
    // Полный сброс формы: пользовательские поля очищаются, системные (оператор,
    // станок) сохраняются, дата/время обновляются.
    setParams(emptyParams());
    setMaterialIdState("");
    setOrder((previous) => ({
      ...previous,
      date: todayIsoDate(),
      time: currentTime(),
      orderNumber: generateOrderNumber(),
      customer: "",
      coating: DEFAULT_COATING,
      comment: "",
    }));
    reset();
  }, [reset]);

  // Отменить производство: сбрасывает активную сессию без сохранения в историю,
  // освобождает станок и возвращает экран в режим создания нового заказа.
  // Снимок активной сессии очищается автоматически (фаза → setup).
  const cancelProduction = useCallback(() => {
    setBusyMachines((machines) => machines.filter((m) => m !== order.machine));
    setPhase("setup");
    setStartedAt(null);
    setProductionLog([]);
    setCompletionSummary(null);
    setParams(emptyParams());
    setMaterialIdState("");
    setOrder((previous) => ({
      ...previous,
      date: todayIsoDate(),
      time: currentTime(),
      orderNumber: generateOrderNumber(),
      customer: "",
      coating: DEFAULT_COATING,
      comment: "",
    }));
    reset();
  }, [reset, order.machine]);

  return {
    loading,
    order,
    updateOrder,
    materials: activeMaterials,
    materialId,
    setMaterialId,
    selectedMaterial,
    availableJumbos: availableForMaterial,
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
    phase,
    orderStatusLabel,
    locked,
    canStart,
    startedAt,
    startProduction,
    pauseProduction,
    resumeProduction,
    finishProduction,
    finishing,
    newOrder,
    cancelProduction,
    productionLog,
    addDefect,
    addStop,
    addNote,
    defectCount,
    defectAreaM2,
    activeDefectCount,
    activeDefectAreaM2,
    techScrapM,
    liveRemainderM,
    completionSummary,
    machineStatusLabel,
    machineBusy,
    busyMachineMessage: BUSY_MACHINE_MESSAGE,
  };
}
