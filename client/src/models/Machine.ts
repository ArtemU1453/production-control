/** Cutting machine a production order is run on. */
export enum Machine {
  machine1 = "machine1",
  machine2 = "machine2",
}

const titles: Record<Machine, string> = {
  [Machine.machine1]: "Станок №1",
  [Machine.machine2]: "Станок №2",
};

export function machineTitle(machine: Machine): string {
  return titles[machine];
}

export const machineOrder: readonly Machine[] = [Machine.machine1, Machine.machine2];
