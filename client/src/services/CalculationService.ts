import {
  calculate,
  type CalcResult,
} from "../core/calculator/calculatorLogic";
import type { CuttingOrderInput } from "../models";

/**
 * Domain service around the cutting-plan engine.
 *
 * It adapts the structured {@link CuttingOrderInput} to the calculation engine
 * without altering any of its behaviour — the engine is called with exactly the
 * same arguments, in the same order, as before this refactor. The service
 * exists so the UI depends on an abstraction rather than importing the engine
 * directly.
 */
export interface CalculationService {
  calculate(input: CuttingOrderInput): CalcResult;
}

export function createCalculationService(): CalculationService {
  return {
    calculate(input) {
      return calculate(
        input.materialWidthMm,
        input.usefulWidthMm,
        input.rollWidthMm,
        input.rollLengthM,
        input.bigRollLengthM,
        input.orderRolls,
        input.additionalWidthMm ?? null,
        input.additionalWidthMm2 ?? null,
        input.additionalAuto ?? true,
      );
    },
  };
}

export type { CalcResult };
