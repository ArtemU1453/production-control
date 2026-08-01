import { surfaces } from "@/core/theme/theme";
import { AppRadius } from "./AppRadius";
import { AppShadow } from "./AppShadow";
import { AppSpacing } from "./AppSpacing";

/**
 * AppCardStyle — Card-First surfaces. The app favours cards over plain lists;
 * this token defines the canonical card geometry (glass material, card radius,
 * resting elevation, grid-aligned padding) plus a leading status-bar helper for
 * Jumbo/status cards, where colour lives in a 4px bar, never the whole card.
 */
export const AppCardStyle = {
  /** Standard content card. */
  surface: `${surfaces.glassCard} ${AppRadius.role.card} border-card-border ${AppShadow.level.card} p-3`,
  /** Interactive (tappable) card. */
  interactive: "transition-transform active:scale-[0.99]",
  /** Leading colour bar for status cards (colour applied via inline style). */
  statusBar: "before:absolute before:inset-y-0 before:left-0 before:w-1 before:rounded-l-3xl relative overflow-hidden",
} as const;
