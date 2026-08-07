/** The input parameters of a single cutting calculation. Shared by the
 *  calculation service, the free calculator and production sessions. */
export interface CuttingOrderInput {
  materialWidthMm: number;
  usefulWidthMm: number;
  rollWidthMm: number;
  rollLengthM: number;
  bigRollLengthM: number;
  orderRolls: number;
  additionalWidthMm?: number;
  /** Second additional size (мм) — manual mode only. Optional for backward
   *  compatibility with orders created before two additional sizes existed. */
  additionalWidthMm2?: number;
  /** Whether additional sizes are auto-detected (true/undefined) or entered
   *  manually (false). Absent on legacy orders → treated as auto. */
  additionalAuto?: boolean;
}
