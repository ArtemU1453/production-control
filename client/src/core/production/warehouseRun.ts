/**
 * Warehouse (складское) production — the single, shared way to tell whether a
 * production run targets the finished-goods warehouse instead of a customer
 * order.
 *
 * A run is a warehouse run when its customer is literally «Склад». Both entry
 * points — the «На склад» toggle and typing «Склад» into the customer field —
 * funnel through this one predicate, so there is exactly one mechanism and the
 * two can never contradict each other. On such a run the whole good output
 * (main + additional rolls, minus defects) is booked to stock at finish, and no
 * order number is required.
 */

/** The customer value that marks a run as a warehouse (складское) production. */
export const WAREHOUSE_CUSTOMER = "Склад";

/** True when the given customer denotes a warehouse run (case/space-insensitive). */
export function isWarehouseCustomer(customer: string | undefined | null): boolean {
  return (customer ?? "").trim().toLowerCase() === WAREHOUSE_CUSTOMER.toLowerCase();
}
