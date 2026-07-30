import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "@/resources/icons";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** Visual tone of the icon chip. */
  tone?: "primary" | "accent";
  /** Optional trailing content, e.g. a badge or action. */
  trailing?: ReactNode;
  className?: string;
}

/** A titled section header with an icon chip, matching the app card style. */
export function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  tone = "primary",
  trailing,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-2">
        {Icon ? (
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-2xl",
              tone === "primary"
                ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                : "bg-accent text-accent-foreground",
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </div>
        ) : null}
        <div>
          <div className="text-sm font-semibold">{title}</div>
          {subtitle ? (
            <div className="text-xs text-muted-foreground">{subtitle}</div>
          ) : null}
        </div>
      </div>
      {trailing}
    </div>
  );
}
