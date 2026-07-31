import { icons, type IconName, type LucideIcon } from "@/resources/icons";

/**
 * AppIcons — the single semantic icon set. Re-exports the existing role-based
 * icon map so screens reference an icon by role (`AppIcons.warehouse`) rather
 * than importing concrete lucide symbols, keeping iconography consistent.
 */
export const AppIcons = icons;

export type { IconName, LucideIcon };
