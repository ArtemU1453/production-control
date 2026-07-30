/** Number formatting helpers shared across the UI. Grouped here so screens
 *  present values (millimetres, metres, areas, percentages) consistently. */

export function formatMm(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)} мм`;
}

export function formatMeters(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)} м`;
}

export function formatArea(value: number): string {
  return `${value.toFixed(1)} м²`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatCount(value: number, unit = "шт."): string {
  return `${value} ${unit}`;
}

/** Converts a fractional hours value into a "H ч. M мин." label. */
export function formatHours(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h} ч. ${m} мин.`;
}
