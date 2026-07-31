import { surfaces } from "@/core/theme/theme";

/**
 * AppMaterials — translucent "material" surfaces (the web analogue of Apple's
 * `.ultraThinMaterial` etc.). Re-exports the existing glass/subtle surface
 * classes and names the app background, so material treatments come from one
 * place and adapt to Light/Dark automatically.
 */
export const AppMaterials = {
  /** Frosted glass card material. */
  glass: surfaces.glassCard,
  /** Subtle bordered material. */
  thin: surfaces.subtleCard,
  /** App screen background (ambient gradient). */
  background: surfaces.screenBackground,
} as const;
