/**
 * Красящий слой (coating side) of a thermal-transfer ribbon roll: whether the
 * ink layer is wound facing in (IN) or out (OUT). Chosen per production order
 * and carried through history, finished goods, reports and documents.
 */
export enum Coating {
  in = "in",
  out = "out",
}

const titles: Record<Coating, string> = {
  [Coating.in]: "IN",
  [Coating.out]: "OUT",
};

export function coatingTitle(coating: Coating): string {
  return titles[coating] ?? String(coating);
}

export const coatingOrder: readonly Coating[] = [Coating.in, Coating.out];

/** Default coating for a new production order. */
export const DEFAULT_COATING = Coating.out;
