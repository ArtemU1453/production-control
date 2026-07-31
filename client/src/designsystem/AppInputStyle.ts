import { AppRadius } from "./AppRadius";

/**
 * AppInputStyle — text-field and control geometry tokens. Consistent radius,
 * minimum 44px height and focus ring across every input in the app.
 */
export const AppInputStyle = {
  field: `w-full ${AppRadius.role.control} min-h-11 bg-input/40 px-4 text-[0.9375rem] outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring`,
  label: "text-[0.8125rem] font-medium text-muted-foreground",
} as const;
