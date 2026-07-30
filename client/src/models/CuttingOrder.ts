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
}
