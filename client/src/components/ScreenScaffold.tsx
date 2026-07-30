import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { animations, surfaces } from "@/core/theme/theme";

interface ScreenScaffoldProps {
  title: string;
  subtitle?: string;
  /** Toolbar content shown on the trailing side of the header. */
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * The shell every screen renders inside. It supplies the app background, safe
 * areas, a large-title navigation header with an optional toolbar, and a
 * content column padded to clear the bottom tab bar — the web analogue of a
 * NavigationStack scene.
 */
export function ScreenScaffold({
  title,
  subtitle,
  toolbar,
  children,
  className,
}: ScreenScaffoldProps) {
  return (
    <div className={cn("min-h-dvh", surfaces.screenBackground)}>
      <div className="app-safe mx-auto w-full max-w-[560px] pb-24">
        <header className="px-4 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {subtitle ? (
                <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
            {toolbar ? <div className="flex shrink-0 items-center gap-2">{toolbar}</div> : null}
          </div>
        </header>

        <motion.main
          initial={animations.screenEnter.initial}
          animate={animations.screenEnter.animate}
          transition={animations.screenEnter.transition}
          className={cn("px-4 pt-4", className)}
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
