import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { tabs, iconFor } from "@/app/navigation";

function isActive(current: string, path: string): boolean {
  return path === "/" ? current === "/" : current.startsWith(path);
}

/**
 * BottomNav — the mobile / tablet primary navigation.
 *
 * Part of the unified {@link AppLayout}: it is `fixed` to the safe-area bottom
 * and shown only below `lg` (desktop uses the Sidebar instead). The layout
 * reserves matching bottom padding on the scroll area, so content is never
 * hidden behind it. Marked `data-app-chrome` so print/PDF drops it.
 */
export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav
      data-app-chrome
      aria-label="Основная навигация"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex w-full max-w-[640px] items-stretch justify-between px-2">
        {tabs.map((tab) => {
          const Icon = iconFor(tab.icon);
          const active = isActive(location, tab.path);
          return (
            <Link
              key={tab.key}
              href={tab.path}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={cn("h-5 w-5", active && "drop-shadow-[var(--shadow-glow)]")} />
              <span className="leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
