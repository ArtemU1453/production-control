import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { ThemeManager } from "@/core/theme/ThemeManager";
import { AppServicesProvider, useServices } from "@/core/di/AppServices";
import { ErrorBoundary } from "@/app/ErrorBoundary";

/** Wraps the tree in an error boundary that routes render crashes to the admin
 *  error log (React never sends those through window.onerror). */
function CrashLoggingBoundary({ children }: { children: ReactNode }) {
  const { errorHandler } = useServices();
  return (
    <ErrorBoundary
      onError={(error, info) => {
        // Preserve the React component stack alongside the error stack, then
        // route through the unified handler (logs + persists to the error log).
        const wrapped = error instanceof Error ? error : new Error(String(error));
        wrapped.stack = `${wrapped.stack ?? ""}\n${info.componentStack ?? ""}`.trim();
        errorHandler.handle(wrapped, "render");
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Composes the application-wide providers in one place: data fetching, theme,
 * dependency injection, motion and UI infrastructure. Screens can assume all of
 * these are available. `MotionConfig reducedMotion="user"` makes every
 * animation honour the OS "Reduce Motion" setting.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppServicesProvider>
        <CrashLoggingBoundary>
          <ThemeManager>
            <MotionConfig reducedMotion="user">
              <TooltipProvider>
                {children}
                <Toaster />
              </TooltipProvider>
            </MotionConfig>
          </ThemeManager>
        </CrashLoggingBoundary>
      </AppServicesProvider>
    </QueryClientProvider>
  );
}
