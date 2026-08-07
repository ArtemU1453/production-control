import type { Coating } from "./Coating";
import type { Machine } from "./Machine";
import type { StatusColorRole } from "./JumboStatus";

/**
 * Lifecycle status of a finished roll (готовый рулон) on the finished-goods
 * warehouse. This is a separate ledger from the material warehouse (Jumbo):
 * here every unit is an already-produced roll of product.
 */
export enum FinishedRollStatus {
  /** В заказе — attached to and delivered for the customer order. */
  inOrder = "inOrder",
  /** На складе — finished-goods stock (surplus, or all rolls when the run
   *  targets the warehouse directly). */
  inStock = "inStock",
  /** Зарезервирован — held for a customer/shipment, still in the warehouse. */
  reserved = "reserved",
  /** Отгружен — shipped out; kept in history, never deleted. */
  shipped = "shipped",
  /** Списан — written off (defect found later, damage); kept in history. */
  writtenOff = "writtenOff",
}

const statusTitles: Record<FinishedRollStatus, string> = {
  [FinishedRollStatus.inOrder]: "В заказе",
  [FinishedRollStatus.inStock]: "На складе",
  [FinishedRollStatus.reserved]: "Зарезервирован",
  [FinishedRollStatus.shipped]: "Отгружен",
  [FinishedRollStatus.writtenOff]: "Списан",
};

export function finishedRollStatusTitle(status: FinishedRollStatus): string {
  return statusTitles[status] ?? status;
}

const statusRoles: Record<FinishedRollStatus, StatusColorRole> = {
  [FinishedRollStatus.inOrder]: "neutral",
  [FinishedRollStatus.inStock]: "neutral",
  [FinishedRollStatus.reserved]: "warning",
  [FinishedRollStatus.shipped]: "muted",
  [FinishedRollStatus.writtenOff]: "danger",
};

export function finishedRollStatusColorRole(status: FinishedRollStatus): StatusColorRole {
  return statusRoles[status] ?? "neutral";
}

/** Stable display order of the statuses (used for filter chips). */
export const finishedRollStatusOrder: readonly FinishedRollStatus[] = [
  FinishedRollStatus.inOrder,
  FinishedRollStatus.inStock,
  FinishedRollStatus.reserved,
  FinishedRollStatus.shipped,
  FinishedRollStatus.writtenOff,
];

/** One entry of a finished roll's movement history. */
export interface FinishedRollHistoryEntry {
  id: string;
  at: string;
  status: FinishedRollStatus;
  /** Free-form label of the movement (e.g. «Поступил на склад»). */
  title: string;
  operator?: string;
  note?: string;
}

/**
 * A single finished roll — one accounting unit on the finished-goods warehouse.
 *
 * Created automatically when a production run completes (good product only —
 * defects never become a finished roll). Each record carries the full context
 * of the roll and its movement history, and is never deleted (shipped rolls
 * stay in history).
 */
export interface FinishedRoll {
  id: string;
  /** Human-readable roll number (е.g. «РЛ-260806-0001»). */
  number: string;
  orderNumber: string;
  materialId: string;
  materialCode: string;
  widthMm: number;
  lengthM: number;
  /** Quantity — one physical roll per record. */
  count: number;
  /** Manufacturing date (ISO). */
  producedAt: string;
  machine: Machine;
  operator: string;
  /** Красящий слой (IN/OUT). Optional for rolls made before the field existed. */
  coating?: Coating;
  /** Why the roll appeared on the finished-goods warehouse (e.g. излишек). */
  sourceReason?: string;
  /** Stock number of the Jumbo this roll was cut from. */
  jumboStockNumber: string;
  status: FinishedRollStatus;
  /** Optional storage location (reserved for a future warehouse map). */
  storageLocation?: string;
  comment?: string;
  /** Production session / order chain this roll belongs to. */
  sessionId?: string;
  chainId?: string;
  history: FinishedRollHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}
