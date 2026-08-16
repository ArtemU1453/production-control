import type { CalcResult } from "../core/calculator/calculatorLogic";
import type { CuttingOrderInput } from "./CuttingOrder";
import type { CuttingRoll } from "./CuttingRoll";
import type { Coating } from "./Coating";
import { Machine } from "./Machine";

/** Lifecycle status of a production session. */
export enum CuttingSessionStatus {
  /** Активна — the calculation stands. */
  active = "active",
  /** Отменена — the transaction was rolled back. */
  reverted = "reverted",
}

/**
 * A defect recorded during the run, persisted with the session so the history
 * report and future analytics can show reject rolls separately from good rolls.
 * Derived from the production journal at finish; each entry keeps the size,
 * reason and time the operator recorded.
 */
export interface SessionDefect {
  id: string;
  /** When the defect was recorded (ISO). */
  at: string;
  /** Number of reject rolls in this entry. */
  count: number;
  /** Roll width (mm), if known. */
  widthMm?: number;
  /** Scrapped area (m²), if known. */
  areaM2?: number;
  /** Material length consumed by the defect (m), if known. */
  meters?: number;
  /** Reason / comment recorded by the operator. */
  reason?: string;
  /** Operator who recorded it. */
  operator?: string;
  /** Stock number of the Jumbo the defect belongs to. */
  jumboStockNumber?: string;
}

/** Order paperwork filled in before a production run. Persisted with the
 *  session so history keeps the full context of every calculation. */
export interface OrderInfo {
  /** Дата (ISO date). */
  date: string;
  /** Время (HH:MM). */
  time: string;
  customer: string;
  orderNumber: string;
  operator: string;
  machine: Machine;
  /** Красящий слой (IN/OUT). Optional for backward compatibility with sessions
   *  saved before the field existed. */
  coating?: Coating;
  comment?: string;
}

/**
 * The primary production-history entity.
 *
 * One session unites the order info, the chosen Jumbo, the computed plan, all
 * produced rolls, the ids of its journal operations and (in a later phase) its
 * waste records. It carries a `transactionId` (shared with its operations so a
 * whole run can be rolled back atomically) and a `version` — always 1 now, but
 * the field lets later phases keep prior versions of an order.
 */
export interface CuttingSession {
  id: string;
  /** Groups this session with the JumboOperations of the same atomic run. */
  transactionId: string;
  /** Order version. Always 1 in this phase; reserved for future re-versioning. */
  version: number;
  status: CuttingSessionStatus;

  createdAt: string;
  updatedAt: string;

  order: OrderInfo;

  /** The consumed Jumbo (relation) and denormalized display fields. */
  jumboId: string;
  jumboStockNumber: string;
  materialCode: string;

  /** Calculation inputs and the computed plan snapshot. */
  input: CuttingOrderInput;
  result: CalcResult;

  /** Every produced roll, each with its destination. */
  rolls: CuttingRoll[];

  /** Ids of the JumboOperation entries created for this session. */
  operationIds: string[];
  /** Ids of waste records for this session (populated in a later phase). */
  wasteIds: string[];

  /**
   * Defects recorded for this session's Jumbo (persisted at finish). Optional
   * for backward compatibility with sessions saved before defects were stored —
   * such sessions simply report no defect breakdown.
   */
  defects?: SessionDefect[];

  /**
   * Multi-Jumbo order chain (optional). When one order is fulfilled across
   * several Jumbos, every session of that order shares a `chainId`, and
   * `chainIndex` gives its 1-based position in the chain. Absent for ordinary
   * single-Jumbo orders. This only links existing session records — no cutting
   * math or material data changes.
   */
  chainId?: string;
  chainIndex?: number;

  comment?: string;
}
