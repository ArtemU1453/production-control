import { icons, type IconName } from "@/resources/icons";
import { strings } from "@/resources/strings";

export interface TabDefinition {
  key: string;
  path: string;
  label: string;
  icon: IconName;
}

/** Single source of truth for the tab bar and the router. Reordering or adding
 *  a tab is a one-line change here. */
export const tabs: readonly TabDefinition[] = [
  { key: "dashboard", path: "/", label: strings.tabs.dashboard, icon: "dashboard" },
  { key: "calculator", path: "/calculator", label: strings.tabs.calculator, icon: "calculator" },
  { key: "materials", path: "/materials", label: strings.tabs.materials, icon: "material" },
  { key: "warehouse", path: "/warehouse", label: strings.tabs.warehouse, icon: "warehouse" },
  { key: "history", path: "/history", label: strings.tabs.history, icon: "history" },
  { key: "reports", path: "/reports", label: strings.tabs.reports, icon: "reports" },
  { key: "settings", path: "/settings", label: strings.tabs.settings, icon: "settings" },
];

/** Secondary destinations surfaced in the desktop sidebar only. They keep the
 *  phone bottom bar focused on the primary tabs while giving desktop the full
 *  professional navigation. */
export const secondaryNav: readonly TabDefinition[] = [
  { key: "production", path: "/production", label: "Производство", icon: "gauge" },
  { key: "analytics", path: "/analytics", label: "Аналитика", icon: "analytics" },
  { key: "documents", path: "/documents", label: "Документы", icon: "reports" },
  { key: "archive", path: "/archive", label: "Архив", icon: "archive" },
];

export function iconFor(name: IconName) {
  return icons[name];
}
