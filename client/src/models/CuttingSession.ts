import type { CalcResult } from "../core/calculator/calculatorLogic";
import type { CuttingOrderInput } from "./CuttingOrder";
import type { CuttingRoll } from "./CuttingRoll";
import { Machine } from "./Machine";

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
  comment?: string;
}

/**
 * The primary production-history entity.
 *
 * One session unites the order info, the chosen Jumbo, the computed plan, all
 * produced rolls, the ids of its journal operations and (in a later phase) its
 * waste records. History and reports are built from these records.
 */
export interface CuttingSession {
  id: string;
  createdAt: string;
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
}
