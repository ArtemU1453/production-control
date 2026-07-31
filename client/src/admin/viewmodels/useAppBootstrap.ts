import { useEffect } from "react";
import { useServices } from "@/core/di/AppServices";

/**
 * Application bootstrap. Seeds the default administrator on first launch and
 * installs a global handler that records uncaught errors and unhandled promise
 * rejections into the admin error log, so failures are diagnosable after the
 * fact. Runs once for the app's lifetime.
 */
export function useAppBootstrap(): void {
  const { admin, errorHandler } = useServices();

  useEffect(() => {
    void admin.users.ensureDefault();

    if (typeof window === "undefined") {
      return;
    }

    const onError = (event: ErrorEvent) => {
      errorHandler.handle(event.error ?? event.message, "window.onerror");
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      errorHandler.handle(event.reason, "unhandledrejection");
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [admin, errorHandler]);
}
