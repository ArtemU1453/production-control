/** Category of waste generated during cutting. */
export enum WasteKind {
  /** Кромочный отход — edge trim. */
  edge = "edge",
  /** Внутренний отход — inner strip waste. */
  inner = "inner",
  /** Технологический остаток — technological scrap (setup/changeover). */
  technological = "technological",
}

/** A recorded waste amount, attributable to an order and/or a Jumbo. */
export interface Waste {
  id: string;
  kind: WasteKind;
  areaM2: number;
  widthMm?: number;
  lengthM?: number;
  orderId?: string;
  jumboId?: string;
  createdAt: string;
}
