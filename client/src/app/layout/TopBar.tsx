import { useLocation } from "wouter";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppTypography } from "@/designsystem";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/core/theme/ThemeManager";
import { tabs, secondaryNav } from "@/app/navigation";

function currentSection(path: string): string {
  const all = [...tabs, ...secondaryNav];
  // Longest matching path wins so e.g. /settings/security resolves to Настройки.
  const match = all
    .filter((t) => (t.path === "/" ? path === "/" : path.startsWith(t.path)))
    .sort((a, b) => b.path.length - a.path.length)[0];
  return match?.label ?? "Production Control";
}

/**
 * TopBar — the desktop (`lg`+) top bar of the unified {@link AppLayout}.
 *
 * `sticky` at the top of the content column (shown only at `lg`+), it names the
 * current section and hosts the theme toggle. Marked `data-app-chrome` so print
 * drops it.
 */
export function TopBar() {
  const [location] = useLocation();
  const { isDark, toggle } = useTheme();

  return (
    <header
      data-app-chrome
      className="sticky top-0 z-30 hidden h-16 items-center justify-between gap-3 border-b border-border/60 bg-background/70 px-6 backdrop-blur-xl lg:flex"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingRight: "max(1.5rem, env(safe-area-inset-right))" }}
    >
      <div className={cn(AppTypography.headline, "truncate")}>{currentSection(location)}</div>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-xl"
        onClick={toggle}
        aria-label={isDark ? "Светлая тема" : "Тёмная тема"}
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>
    </header>
  );
}
