/**
 * AppError — the single, structured error shape for the whole app.
 *
 * Purpose: give every failure a consistent form (code, severity, a technical
 * message, a user-facing message and optional context/cause), so errors can be
 * logged, displayed and reasoned about uniformly. Usage:
 * `throw appError("backup.restore", "Version too new", { userMessage: "…" })`,
 * or normalise unknown errors via {@link toAppError}. Limits: a plain data
 * carrier — display/logging live in the ErrorHandler. Depends on: nothing.
 */
export enum ErrorSeverity {
  warning = "warning",
  error = "error",
  critical = "critical",
}

export interface AppError {
  /** Stable, dot-namespaced code, e.g. `warehouse.completeCalculation`. */
  code: string;
  severity: ErrorSeverity;
  /** Technical message for logs. */
  message: string;
  /** Friendly message shown to the operator. */
  userMessage: string;
  context?: Record<string, unknown>;
  /** Original error, if any. */
  cause?: unknown;
}

const DEFAULT_USER_MESSAGE = "Произошла ошибка. Повторите действие или перезагрузите экран.";

export interface AppErrorOptions {
  severity?: ErrorSeverity;
  userMessage?: string;
  context?: Record<string, unknown>;
  cause?: unknown;
}

/** Builds a structured {@link AppError}. */
export function appError(code: string, message: string, options: AppErrorOptions = {}): AppError {
  return {
    code,
    severity: options.severity ?? ErrorSeverity.error,
    message,
    userMessage: options.userMessage ?? DEFAULT_USER_MESSAGE,
    context: options.context,
    cause: options.cause,
  };
}

export function isAppError(value: unknown): value is AppError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "severity" in value &&
    "userMessage" in value
  );
}

/** Normalises any thrown value into an {@link AppError}. */
export function toAppError(value: unknown, code = "app.unknown"): AppError {
  if (isAppError(value)) {
    return value;
  }
  if (value instanceof Error) {
    return appError(code, value.message, { cause: value });
  }
  return appError(code, String(value), { cause: value });
}
