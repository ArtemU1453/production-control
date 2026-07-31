import type { StatusColorRole } from "@/models";
import { AppRadius } from "./AppRadius";

/**
 * AppBadgeStyle — status-badge tokens keyed by tone. Matches the existing
 * StatusBadge tones so a pill's colour encodes the same meaning across screens.
 */
const toneClasses: Record<StatusColorRole, string> = {
  neutral: "bg-secondary text-secondary-foreground border-secondary-border",
  warning:
    "bg-[hsl(38_92%_50%/0.15)] text-[hsl(38_92%_38%)] border-[hsl(38_92%_50%/0.3)] dark:text-[hsl(38_92%_60%)]",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
  muted: "bg-muted text-muted-foreground border-muted-border",
};

export const AppBadgeStyle = {
  base: `inline-flex items-center border px-2 py-0.5 text-xs font-medium ${AppRadius.role.pill}`,
  tone(tone: StatusColorRole): string {
    return toneClasses[tone];
  },
} as const;
