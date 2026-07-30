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

export function iconFor(name: IconName) {
  return icons[name];
}
