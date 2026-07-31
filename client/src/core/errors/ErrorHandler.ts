import type { Logger } from "@/core/logging/Logger";
import { ErrorSeverity, toAppError, type AppError } from "./AppError";

/**
 * ErrorHandler — the single entry point for handling failures.
 *
 * Purpose: enforce one flow for every error — normalise to {@link AppError},
 * log it (via the injected {@link Logger}), forward it to an optional report
 * sink (e.g. the persistent error log / a future crash reporter) and return a
 * safe user-facing message. Errors are never rethrown, so a handled failure
 * cannot crash the app. Usage: `const msg = errorHandler.handle(err, "backup.restore")`.
 * Limits: does not show UI itself — the caller decides how to present the
 * returned message (toast, inline). Depends on: Logger, AppError.
 */
export type ErrorReportSink = (error: AppError) => void;

export interface ErrorHandler {
  /** Handle an error and return the user-facing message. */
  handle(error: unknown, code?: string): string;
  /** Register an additional report sink (e.g. crash reporter). */
  addReportSink(sink: ErrorReportSink): void;
}

export interface ErrorHandlerDeps {
  logger: Logger;
  /** Optional persistent/report sinks (error log, crash reporter). */
  reportSinks?: ErrorReportSink[];
}

export function createErrorHandler(deps: ErrorHandlerDeps): ErrorHandler {
  const sinks: ErrorReportSink[] = [...(deps.reportSinks ?? [])];

  return {
    handle(error, code) {
      const appErr = toAppError(error, code);
      const context = { code: appErr.code, severity: appErr.severity, ...appErr.context };

      if (appErr.severity === ErrorSeverity.warning) {
        deps.logger.warn(appErr.message, context);
      } else {
        deps.logger.error(appErr.message, context);
      }

      for (const sink of sinks) {
        try {
          sink(appErr);
        } catch {
          // A failing report sink must never break error handling.
        }
      }

      return appErr.userMessage;
    },
    addReportSink(sink) {
      sinks.push(sink);
    },
  };
}
