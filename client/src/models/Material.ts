/**
 * A raw material grade that Jumbo rolls are made of.
 *
 * Domain models in this layer are plain, serializable data structures:
 *  - serializable to JSON (Codable),
 *  - carry a stable `id` (Identifiable / Hashable),
 *  - hold no behaviour and no references to the UI (Sendable-friendly).
 */
export interface Material {
  id: string;
  /** Код материала — warehouse material code. */
  code: string;
  name: string;
  /** Nominal web width in millimetres. */
  widthMm: number;
  /** Optional grammage / density, reserved for future analytics. */
  density?: number;
  createdAt: string;
}
