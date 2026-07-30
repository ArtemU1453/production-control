/** Lifecycle state of a material in the reference book. */
export enum MaterialStatus {
  /** Активен — available for new Jumbos. */
  active = "active",
  /** Неактивен — kept for history but not offered for new receipts. */
  inactive = "inactive",
}

const titles: Record<MaterialStatus, string> = {
  [MaterialStatus.active]: "Активен",
  [MaterialStatus.inactive]: "Неактивен",
};

export function materialStatusTitle(status: MaterialStatus): string {
  return titles[status];
}

export const materialStatusOrder: readonly MaterialStatus[] = [
  MaterialStatus.active,
  MaterialStatus.inactive,
];
