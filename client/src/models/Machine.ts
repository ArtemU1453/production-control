/** Cutting machine a production order is run on. */
export enum Machine {
  machine1 = "machine1",
  machine2 = "machine2",
}

export const machineOrder: readonly Machine[] = [Machine.machine1, Machine.machine2];

/** Numbered fallback names, used when the operator has not set a custom name. */
const fallbackTitles: Record<Machine, string> = {
  [Machine.machine1]: "Станок №1",
  [Machine.machine2]: "Станок №2",
};

/**
 * Operator-defined display names, index-aligned with {@link machineOrder}.
 * This module is the single source of truth for machine names across the whole
 * app: every screen, report, label and search result reads them through
 * {@link machineTitle}, and they are kept in sync with «Настройки → Производство»
 * via {@link setMachineDisplayNames}. Empty by default → numbered fallback.
 */
const displayNames = new Map<Machine, string>();

/**
 * Registers the operator's machine names from the settings string
 * (`"TTR 2000, SDR1Plus"`). Names map by position onto {@link machineOrder};
 * blank or missing entries fall back to «Станок №N». Called whenever settings
 * are loaded or saved, and once synchronously at startup, so `machineTitle`
 * always reflects the current settings.
 */
export function setMachineDisplayNames(namesCsv: string | undefined | null): void {
  const parsed = (namesCsv ?? "").split(",").map((part) => part.trim());
  displayNames.clear();
  machineOrder.forEach((machine, index) => {
    const name = parsed[index];
    if (name && name.length > 0) {
      displayNames.set(machine, name);
    }
  });
}

/**
 * Operator-facing machine name — the configured name when set, otherwise the
 * numbered fallback «Станок №N». The internal enum id (machine1/machine2) is
 * unchanged; only the displayed name is resolved here.
 */
export function machineTitle(machine: Machine): string {
  return displayNames.get(machine) ?? fallbackTitles[machine];
}
