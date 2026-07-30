import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { ThemeManager } from "@/core/theme/ThemeManager";
import { AppServicesProvider } from "@/core/di/AppServices";

/**
 * Composes the application-wide providers in one place: data fetching, theme,
 * dependency injection and UI infrastructure. Screens can assume all of these
 * are available.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppServicesProvider>
        <ThemeManager>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </ThemeManager>
      </AppServicesProvider>
    </QueryClientProvider>
  );
}
