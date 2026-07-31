/**
 * AppTypography — Apple text-style tokens mapped to Tailwind utility strings.
 *
 * Mirrors the system Text Styles (Large Title … Caption). Sizes are expressed in
 * `rem` via Tailwind classes so they scale with the OS font size (Dynamic Type
 * equivalent). The system font stack (`--font-sans`, which begins with
 * `-apple-system`/`system-ui`) renders as SF Pro on Apple platforms.
 *
 * Consume as `className={AppTypography.headline}` — no ad-hoc font utilities in
 * feature code.
 */
export const AppTypography = {
  largeTitle: "text-[2.125rem] font-bold leading-tight tracking-tight",
  title: "text-[1.75rem] font-bold leading-tight tracking-tight",
  title2: "text-[1.375rem] font-semibold leading-snug tracking-tight",
  headline: "text-[1.0625rem] font-semibold leading-snug",
  body: "text-[1.0625rem] font-normal leading-normal",
  callout: "text-base font-normal leading-normal",
  subheadline: "text-[0.9375rem] font-medium leading-normal",
  footnote: "text-[0.8125rem] font-normal leading-normal",
  caption: "text-xs font-normal leading-normal",
  caption2: "text-[0.6875rem] font-medium uppercase tracking-wide",
} as const;

export type AppTextStyle = keyof typeof AppTypography;
