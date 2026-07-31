import type { AppError } from "@/core/errors/AppError";

/**
 * Monitoring — integration **points** for crash reporting, analytics and
 * performance monitoring.
 *
 * Purpose: define the contracts a future backend (Sentry, Firebase, custom)
 * implements, so instrumentation can be added without touching business code.
 * No SDK is shipped in this release — the defaults are no-ops. A real backend
 * plugs in by implementing these interfaces and passing them to
 * {@link createMonitoring}. Usage: `monitoring.analytics.track("report_sent")`.
 * Limits: no-op until a provider is supplied. Depends on: AppError.
 */
export interface CrashReporter {
  /** Report a caught/critical error to the crash backend. */
  report(error: AppError): void;
}

export interface AnalyticsTracker {
  /** Record a product analytics event. */
  track(event: string, properties?: Record<string, unknown>): void;
}

export interface PerformanceMonitor {
  /** Measure the duration of a named operation. */
  measure(name: string, durationMs: number): void;
  /** Start a span; returns a stop function that records the duration. */
  startSpan(name: string): () => void;
}

export interface Monitoring {
  crash: CrashReporter;
  analytics: AnalyticsTracker;
  performance: PerformanceMonitor;
}

const noopCrash: CrashReporter = { report() {} };
const noopAnalytics: AnalyticsTracker = { track() {} };
const noopPerformance: PerformanceMonitor = {
  measure() {},
  startSpan() {
    return () => {};
  },
};

export interface MonitoringProviders {
  crash?: CrashReporter;
  analytics?: AnalyticsTracker;
  performance?: PerformanceMonitor;
}

/** Assembles monitoring from provided backends, defaulting each to a no-op. */
export function createMonitoring(providers: MonitoringProviders = {}): Monitoring {
  return {
    crash: providers.crash ?? noopCrash,
    analytics: providers.analytics ?? noopAnalytics,
    performance: providers.performance ?? noopPerformance,
  };
}
