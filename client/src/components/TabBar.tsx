import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { tabs, iconFor } from "@/app/navigation";

function isActive(current: string, path: string): boolean {
  return path === "/" ? current === "/" : current.startsWith(path);
}

/** Bottom tab bar. Fixed to the safe-area bottom, it mirrors a native TabView
 *  and drives navigation across the app's primary sections. */
export function TabBar() {
  const [location] = useLocation();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/80 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Основная навигация"
    >
      <div className="mx-auto flex w-full max-w-[560px] items-stretch justify-between px-2">
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
