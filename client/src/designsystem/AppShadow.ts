/**
 * AppShadow — elevation tokens. Backed by the `--shadow-soft` / `--shadow-glow`
 * custom properties (which already adapt to Dark mode) plus named elevation
 * levels expressed as Tailwind class strings for cards, sheets and floating
 * controls. Elevation communicates hierarchy without heavy borders.
 */
export const AppShadow = {
  variable: {
    soft: "var(--shadow-soft)",
    glow: "var(--shadow-glow)",
  },
  /** Named elevation levels as Tailwind classes. */
  level: {
    none: "shadow-none",
    /** Resting cards. */
    card: "shadow-[var(--shadow-soft)]",
    /** Raised / active surfaces, bottom sheets. */
    raised: "shadow-lg",
    /** Floating action button. */
    floating: "shadow-xl",
    /** Primary emphasis glow. */
    glow: "shadow-[var(--shadow-glow)]",
  },
} as const;

export type AppElevation = keyof typeof AppShadow.level;
