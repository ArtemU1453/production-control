/** Category of waste generated during cutting or closing. */
export enum WasteKind {
  /** Кромочный отход — edge trim. */
  edge = "edge",
  /** Внутренний отход — inner strip waste. */
  inner = "inner",
  /** Технологический остаток — technological scrap (setup / leftover on close). */
  technological = "technological",
}

const wasteKindTitles: Record<WasteKind, string> = {
  [WasteKind.edge]: "Кромочный отход",
  [WasteKind.inner]: "Внутренний отход",
  [WasteKind.technological]: "Технологический остаток",
};

export function wasteKindTitle(kind: WasteKind): string {
  return wasteKindTitles[kind];
}

/** A recorded waste amount, attributable to a session and/or a Jumbo. */
export interface Waste {
  id: string;
  kind: WasteKind;
  areaM2: number;
  widthMm?: number;
  /** Length in metres (e.g. the leftover metrage counted as technological scrap). */
  lengthM?: number;
  sessionId?: string;
  jumboId?: string;
  operator?: string;
  comment?: string;
  createdAt: string;
}
