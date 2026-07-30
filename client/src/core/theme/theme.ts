/**
 * Central design system for the application.
 *
 * Every colour, radius, spacing step, font, icon and animation used across the
 * UI is declared here so screens never reach for a "magic" value. Colours are
 * expressed as semantic tokens that map to the CSS custom properties declared
 * in `index.css`, which keeps a single source of truth for Light/Dark mode.
 */

export type ColorScheme = "light" | "dark";

/** Semantic colour tokens. Values reference CSS variables so a single palette
 *  drives both Light and Dark appearances. */
export const colors = {
  background: "hsl(var(--background))",
  foreground: "hsl(var(--foreground))",
  card: "hsl(var(--card))",
  cardForeground: "hsl(var(--card-foreground))",
  cardBorder: "hsl(var(--card-border))",
  primary: "hsl(var(--primary))",
  primaryForeground: "hsl(var(--primary-foreground))",
  secondary: "hsl(var(--secondary))",
  secondaryForeground: "hsl(var(--secondary-foreground))",
  muted: "hsl(var(--muted))",
  mutedForeground: "hsl(var(--muted-foreground))",
  accent: "hsl(var(--accent))",
  accentForeground: "hsl(var(--accent-foreground))",
  destructive: "hsl(var(--destructive))",
  destructiveForeground: "hsl(var(--destructive-foreground))",
  border: "hsl(var(--border))",
  ring: "hsl(var(--ring))",
  warning: "hsl(38 92% 50%)",
  success: "hsl(142 71% 45%)",
} as const;

/** Corner radii, aligned with the `--radius` scale in `index.css`. */
export const radii = {
  sm: "rounded-lg",
  md: "rounded-xl",
  lg: "rounded-2xl",
  xl: "rounded-3xl",
  pill: "rounded-full",
} as const;

/** Spacing scale expressed as Tailwind gap/padding steps. */
export const spacing = {
  xs: "1",
  sm: "2",
  md: "3",
  lg: "4",
  xl: "6",
  xxl: "8",
} as const;

/** Font families, mirroring the `--font-*` variables. */
export const fonts = {
  sans: "var(--font-sans)",
  serif: "var(--font-serif)",
  mono: "var(--font-mono)",
} as const;

/** Motion presets consumed by framer-motion transitions. */
export const animations = {
  screenEnter: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  },
  cardEnter: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.28, ease: "easeOut" as const },
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.2 },
  },
} as const;

/** Reusable surface treatments composed from Tailwind utility classes. */
export const surfaces = {
  glassCard: "glass noise",
  subtleCard: "border bg-card/70",
  screenBackground:
    "bg-[radial-gradient(1200px_700px_at_30%_-10%,rgba(37,99,235,.18),transparent_60%),radial-gradient(900px_600px_at_110%_10%,rgba(20,184,166,.14),transparent_55%),linear-gradient(to_bottom,rgba(255,255,255,0.9),rgba(255,255,255,0.85))] dark:bg-[radial-gradient(1200px_700px_at_30%_-10%,rgba(37,99,235,.22),transparent_60%),radial-gradient(900px_600px_at_110%_10%,rgba(20,184,166,.12),transparent_55%),linear-gradient(to_bottom,rgba(2,6,23,0.9),rgba(2,6,23,0.95))]",
} as const;

export const theme = {
  colors,
  radii,
  spacing,
  fonts,
  animations,
  surfaces,
} as const;

export type Theme = typeof theme;
