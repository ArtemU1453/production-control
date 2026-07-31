import { AppRadius } from "./AppRadius";
import { AppShadow } from "./AppShadow";

/**
 * AppButtonStyle — class-string tokens for every button variant. Geometry
 * (radius, min hit height) is shared; only the colour treatment varies. Feature
 * code composes these instead of writing ad-hoc button classes.
 */
export type AppButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "floating";

const base = `inline-flex items-center justify-center gap-2 ${AppRadius.role.button} min-h-11 px-4 text-[0.9375rem] font-medium transition-transform active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50`;

const variants: Record<AppButtonVariant, string> = {
  primary: `bg-primary text-primary-foreground ${AppShadow.level.glow}`,
  secondary: "bg-secondary text-secondary-foreground",
  danger: "bg-destructive text-destructive-foreground",
  ghost: "bg-transparent text-foreground hover:bg-secondary/60",
  floating: `bg-primary text-primary-foreground rounded-full h-14 w-14 p-0 ${AppShadow.level.floating}`,
};

export const AppButtonStyle = {
  base,
  variants,
  /** Full class string for a variant. */
  variant(variant: AppButtonVariant): string {
    return `${base} ${variants[variant]}`;
  },
} as const;
