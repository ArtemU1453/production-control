/**
 * AppSpacing — the 8-point grid. Every spacing value in the app is a multiple of
 * 8 (with a single 4px half-step for tight cases), so layouts stay on-grid and
 * free of magic numbers.
 *
 * `px` holds the raw numbers (for inline styles / JS); `gap`, `pad`, `padX`,
 * `padY` hold the matching Tailwind class strings for use in `className`.
 */
export const AppSpacing = {
  px: {
    /** 4px — half step */
    xxs: 4,
    /** 8px */
    xs: 8,
    /** 16px */
    sm: 16,
    /** 24px */
    md: 24,
    /** 32px */
    lg: 32,
    /** 48px */
    xl: 48,
    /** 64px */
    xxl: 64,
  },
  gap: {
    xxs: "gap-1",
    xs: "gap-2",
    sm: "gap-4",
    md: "gap-6",
    lg: "gap-8",
    xl: "gap-12",
  },
  pad: {
    xxs: "p-1",
    xs: "p-2",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  },
  padX: {
    sm: "px-4",
    md: "px-6",
  },
  padY: {
    sm: "py-4",
    md: "py-6",
  },
} as const;

export type AppSpacingStep = keyof typeof AppSpacing.px;
