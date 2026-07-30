import type { CalcResult } from "../core/calculator/calculatorLogic";

/** The input parameters of a single cutting calculation. */
export interface CuttingOrderInput {
  materialWidthMm: number;
  usefulWidthMm: number;
  rollWidthMm: number;
  rollLengthM: number;
  bigRollLengthM: number;
  orderRolls: number;
  additionalWidthMm?: number;
}

/**
 * A saved cutting order: the inputs, the computed plan snapshot and light
 * bookkeeping. History is a list of these records.
 */
export interface CuttingOrder {
  id: string;
  createdAt: string;
  input: CuttingOrderInput;
  /** Snapshot of the computed plan at save time. */
  result: CalcResult;
  /** Optional link to the Jumbo consumed by this order (future phases). */
  jumboId?: string;
  operator?: string;
  note?: string;
}
