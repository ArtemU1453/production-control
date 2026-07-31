import { radii } from "@/core/theme/theme";

/**
 * AppRadius — corner-radius tokens. Backed by the existing `radii` scale (aligned
 * with the `--radius` custom property) and named by role so components request a
 * radius by intent, never a raw class.
 */
export const AppRadius = {
  scale: radii,
  role: {
    /** Inputs, small controls. */
    control: radii.lg, // rounded-2xl
    /** Buttons. */
    button: radii.lg, // rounded-2xl
    /** Cards / sheets. */
    card: radii.xl, // rounded-3xl
    /** Chips, badges, pills. */
    pill: radii.pill, // rounded-full
    /** Icon chips. */
    chip: radii.lg,
  },
} as const;

export type AppRadiusRole = keyof typeof AppRadius.role;
