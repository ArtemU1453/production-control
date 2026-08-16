import { icons, type IconName } from "@/resources/icons";
import { strings } from "@/resources/strings";

export interface TabDefinition {
  key: string;
  path: string;
  label: string;
  icon: IconName;
}

/**
 * Single source of truth for navigation and the router.
 *
 * The sidebar renders `tabs` then `secondaryNav`, so their concatenation is the
 * exact top-to-bottom order shown to the operator:
 *   Производство → Расчёт → Материалы → Склад → История → Настройки →
 *   Обзор → Аналитика → Документы → Архив.
 * The phone bottom bar shows the primary `tabs` (in the same order). Adding or
 * reordering an entry is a one-line change here.
 */
export const tabs: readonly TabDefinition[] = [
  { key: "production", path: "/production", label: "Производство", icon: "gauge" },
  { key: "calculator", path: "/calculator", label: strings.tabs.calculator, icon: "calculator" },
  { key: "materials", path: "/materials", label: strings.tabs.materials, icon: "material" },
  { key: "warehouse", path: "/warehouse", label: strings.tabs.warehouse, icon: "warehouse" },
  { key: "history", path: "/history", label: strings.tabs.history, icon: "history" },
  { key: "settings", path: "/settings", label: strings.tabs.settings, icon: "settings" },
];

/** Secondary destinations surfaced in the desktop sidebar's «Ещё» group. They
 *  continue the same top-to-bottom order after the primary tabs. */
export const secondaryNav: readonly TabDefinition[] = [
  { key: "dashboard", path: "/", label: strings.tabs.dashboard, icon: "dashboard" },
  { key: "analytics", path: "/analytics", label: "Аналитика", icon: "analytics" },
  { key: "documents", path: "/documents", label: "Документы", icon: "reports" },
  { key: "archive", path: "/archive", label: "Архив", icon: "archive" },
];

export function iconFor(name: IconName) {
  return icons[name];
}
