import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { surfaces } from "@/core/theme/theme";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";

/**
 * AppLayout — the single application shell every screen renders inside.
 *
 * One responsive frame replaces per-screen shells:
 *  • Desktop (`lg`+): a fixed left {@link Sidebar} + sticky {@link TopBar}; the
 *    content column is offset by the sidebar width and there is NO bottom nav.
 *  • Mobile / tablet (`< lg`): a fixed {@link BottomNav}; the content column
 *    reserves matching bottom padding so nothing is ever hidden behind it.
 *
 * Safe areas (notches, home indicator, side cutouts) are applied here once, for
 * all pages, via the `safe-x` / `content-pad-t` / `content-pad-b` utilities and
 * `env(safe-area-inset-*)` on the chrome. Scrolling is the natural document
 * scroll — no inner `overflow` container, no fixed heights, no double scroll —
 * so long pages always scroll fully and short ones never clip.
 *
 * Breakpoint switching is pure CSS (`lg:` visibility) — no JS resize listeners,
 * so there are no extra re-renders or layout-thrash on resize.
 */
export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className={cn("min-h-dvh", surfaces.screenBackground)}>
      <Sidebar />

      <div className="lg:pl-64">
        <TopBar />
        <main className="safe-x content-pad-t content-pad-b mx-auto w-full">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}
