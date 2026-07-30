import type { ReactNode } from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "@/resources/icons";

interface ListRowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  /** Content shown at the trailing edge (badge, action). */
  trailing?: ReactNode;
  /** When set, the whole row links here and a chevron is shown. */
  href?: string;
  className?: string;
}

/** A single glass card row: icon chip, title/subtitle and trailing content.
 *  Shared by the materials, warehouse and archive lists for a uniform look. */
export function ListRow({ title, subtitle, icon: Icon, trailing, href, className }: ListRowProps) {
  const body = (
    <div
      className={cn(
        "glass noise flex items-center gap-3 rounded-3xl border-card-border p-4",
        href && "transition-transform active:scale-[0.99]",
        className,
      )}
    >
      {Icon ? (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{title}</span>
        </div>
        {subtitle ? <div className="truncate text-xs text-muted-foreground">{subtitle}</div> : null}
      </div>
      {trailing}
      {href ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
    </div>
  );

  if (!href) {
    return body;
  }
  return (
    <Link href={href} className="block">
      {body}
    </Link>
  );
}
