import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { animations } from "@/core/theme/theme";

interface ScreenScaffoldProps {
  title: string;
  subtitle?: string;
  /** Toolbar content shown on the trailing side of the header. */
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  /**
   * Wide layout: widens the content column to near-full desktop width for
   * data-dense, multi-column screens (dashboards, the calculator). Opt-in —
   * screens default to a comfortable reading column that still uses desktop
   * width well alongside the sidebar.
   */
  wide?: boolean;
}

/**
 * ScreenScaffold — a screen's title header + content column.
 *
 * The app background, safe areas, navigation (desktop sidebar / mobile bottom
 * bar) and scroll behaviour all live once in {@link AppLayout}; this component
 * only lays out a single screen inside it: a large-title header with an optional
 * toolbar and a centred, responsive content column. Every screen renders through
 * here (directly or via SettingsScaffold), so the whole app shares one layout.
 */
export function ScreenScaffold({
  title,
  subtitle,
  toolbar,
  children,
  className,
  wide = false,
}: ScreenScaffoldProps) {
  return (
    <div className={cn("mx-auto w-full", wide ? "max-w-[1680px]" : "max-w-[1120px]")}>
      <header className="pt-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            {subtitle ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {toolbar ? <div className="flex shrink-0 items-center gap-2">{toolbar}</div> : null}
        </div>
      </header>

      <motion.main
        initial={animations.screenEnter.initial}
        animate={animations.screenEnter.animate}
        transition={animations.screenEnter.transition}
        className={cn("pt-3", className)}
      >
        {children}
      </motion.main>
    </div>
  );
}
