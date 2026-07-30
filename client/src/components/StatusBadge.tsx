import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StatusColorRole } from "@/models";

const toneClasses: Record<StatusColorRole, string> = {
  neutral: "bg-secondary text-secondary-foreground border-secondary-border",
  warning: "bg-[hsl(38_92%_50%/0.15)] text-[hsl(38_92%_38%)] border-[hsl(38_92%_50%/0.3)] dark:text-[hsl(38_92%_60%)]",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
  muted: "bg-muted text-muted-foreground border-muted-border",
};

interface StatusBadgeProps {
  label: string;
  tone: StatusColorRole;
  className?: string;
}

/** A pill badge whose colour encodes a status tone (e.g. Jumbo lifecycle). */
export function StatusBadge({ label, tone, className }: StatusBadgeProps) {
  return (
    <Badge variant="secondary" className={cn("rounded-full", toneClasses[tone], className)}>
      {label}
    </Badge>
  );
}
