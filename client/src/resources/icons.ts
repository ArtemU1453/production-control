import {
  Archive,
  BarChart3,
  Boxes,
  Calculator,
  Clock,
  FileText,
  Gauge,
  History,
  LayoutGrid,
  Layers,
  Package,
  Scissors,
  Settings,
  Sparkles,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

/** Single mapping from semantic names to concrete icon components so screens
 *  reference an icon by role rather than importing lucide symbols directly. */
export const icons = {
  dashboard: LayoutGrid,
  calculator: Calculator,
  cut: Scissors,
  history: History,
  warehouse: Warehouse,
  reports: FileText,
  settings: Settings,
  material: Layers,
  jumbo: Package,
  boxes: Boxes,
  archive: Archive,
  analytics: BarChart3,
  gauge: Gauge,
  clock: Clock,
  quick: Sparkles,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;
export type { LucideIcon };
