import { colors as semanticColors } from "@/core/theme/theme";

/**
 * AppColors — canonical colour tokens for the Design System.
 *
 * Semantic tokens (`semantic`) are backed by the CSS custom properties declared
 * in `index.css`, which drive Light and Dark appearances from one source, so
 * they are re-exported here rather than duplicated. Dark mode uses a **graphite**
 * background (`230 22% 8%`), never pure black — per Apple HIG. On top of the
 * semantic set, this module adds the Apple status palette, the Jumbo status
 * colours (used for the vertical status bar) and the separator token.
 */
export const AppColors = {
  /** Semantic, theme-aware tokens (hsl(var(--…))). */
  semantic: semanticColors,

  /** Apple-style status palette (hsl triplets → `hsl(<token>)`). */
  status: {
    success: "142 71% 45%",
    warning: "38 92% 50%",
    danger: "0 78% 54%",
    info: "205 90% 52%",
  },

  /**
   * Jumbo lifecycle colours for the vertical status bar. The card is never
   * fully tinted — only a 4px leading bar carries the colour.
   * 🟢 onStock · 🔵 inWork · 🟡 ≤300 m · 🔴 used · ⚫ archive
   */
  jumboStatus: {
    onStock: "142 71% 45%", // green
    inWork: "205 90% 52%", // blue
    toWriteOff: "38 92% 50%", // amber
    used: "0 78% 54%", // red
    archive: "230 12% 42%", // graphite
  },

  /** Hairline separator (theme-aware). */
  separator: "hsl(var(--border))",
} as const;

/** Wraps an hsl-triplet token in an `hsl()` colour function. */
export function hsl(token: string): string {
  return `hsl(${token})`;
}

export type AppStatusColor = keyof typeof AppColors.status;
export type JumboStatusColorToken = keyof typeof AppColors.jumboStatus;
