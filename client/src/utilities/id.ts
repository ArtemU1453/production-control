/** Generates a stable unique identifier for domain entities. Uses the platform
 *  crypto UUID when available and falls back to a timestamp-based token. */
export function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
