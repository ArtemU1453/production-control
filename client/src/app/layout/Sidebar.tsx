import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { AppTypography } from "@/designsystem";
import { icons } from "@/resources/icons";
import { tabs, secondaryNav, iconFor, type TabDefinition } from "@/app/navigation";

function isActive(current: string, path: string): boolean {
  return path === "/" ? current === "/" : current.startsWith(path);
}

/** Sidebar width, shared with the layout's content offset via CSS. */
export const SIDEBAR_WIDTH = "16rem"; // 256px

function NavLink({ item, current }: { item: TabDefinition; current: string }) {
  const Icon = iconFor(item.icon);
  const active = isActive(current, item.path);
  return (
    <Link
      href={item.path}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary/12 text-primary"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "drop-shadow-[var(--shadow-glow)]")} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

/**
 * Sidebar — the desktop (`lg`+) primary navigation rail.
 *
 * Part of the unified {@link AppLayout}: `fixed` to the left edge, full height,
 * shown only at `lg`+ (mobile uses BottomNav). Lists the primary tabs plus
 * desktop-only secondary destinations, so desktop never falls back to a phone
 * bottom bar. Marked `data-app-chrome` so print drops it.
 */
export function Sidebar() {
  const [location] = useLocation();
  const AppMark = icons.cut;

  return (
    <aside
      data-app-chrome
      className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-border/60 bg-background/80 backdrop-blur-xl lg:flex"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingLeft: "env(safe-area-inset-left)" }}
      aria-label="Боковая навигация"
    >
      <div className="flex h-14 shrink-0 items-center gap-2.5 px-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <AppMark className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 leading-tight">
          <div className={cn(AppTypography.subheadline, "truncate")}>Production Control</div>
          <div className={cn(AppTypography.caption, "truncate text-muted-foreground")}>Производственный учёт</div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-1.5" aria-label="Основные разделы">
        {tabs.map((item) => (
          <NavLink key={item.key} item={item} current={location} />
        ))}

        <div className={cn(AppTypography.caption2, "px-2.5 pb-1 pt-3 text-muted-foreground")}>Ещё</div>
        {secondaryNav.map((item) => (
          <NavLink key={item.key} item={item} current={location} />
        ))}
      </nav>

      <div
        className={cn(AppTypography.caption, "shrink-0 px-4 py-2 text-muted-foreground")}
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        v2 · Production Control
      </div>
    </aside>
  );
}
