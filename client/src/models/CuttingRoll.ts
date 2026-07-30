/** Kind of roll produced within a cutting session (one "ручей"). */
export enum CuttingRollKind {
  main = "main",
  additional = "additional",
}

/** Where a produced roll goes. Reserved for use in future reports. */
export enum RollDestination {
  /** В заказ — counts toward the customer order. */
  order = "order",
  /** На склад — returned to stock. */
  warehouse = "warehouse",
}

/** A produced roll size within a cutting session. Each roll is stored as its
 *  own record so destinations can differ per row. */
export interface CuttingRoll {
  id: string;
  sessionId: string;
  kind: CuttingRollKind;
  widthMm: number;
  lengthM: number;
  count: number;
  destination: RollDestination;
}
