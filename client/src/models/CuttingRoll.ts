/** Kind of roll produced within a cutting order. */
export enum CuttingRollKind {
  main = "main",
  additional = "additional",
}

/** A produced roll size within a cutting order (one "ручей"). */
export interface CuttingRoll {
  id: string;
  orderId: string;
  kind: CuttingRollKind;
  widthMm: number;
  lengthM: number;
  count: number;
}
