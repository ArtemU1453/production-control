import { appConfig } from "@/config";

/**
 * Logger — a single, level-based logging facility.
 *
 * Purpose: replace ad-hoc `console.*` with one leveled logger that is quiet in
 * Release builds and pluggable (additional sinks for crash/analytics backends).
 * Levels: `debug < info < warn < error`. In production the default minimum level
 * is `warn`, so debug/info are dropped; the console sink is disabled entirely in
 * production, so nothing leaks to the browser console of a shipped build.
 *
 * Usage: `logger.info("Backup created")`, `logger.error("Restore failed", { err })`.
 * Extend by passing extra sinks to {@link createLogger}. Limits: best-effort,
 * non-throwing. Depends on: AppConfig (environment/level gating).
 */
export enum LogLevel {
  debug = 0,
  info = 1,
  warn = 2,
  error = 3,
}

export type LogContext = Record<string, unknown>;
export type LogSink = (level: LogLevel, message: string, context?: LogContext) => void;

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  /** Register an additional sink (e.g. a crash reporter) at runtime. */
  addSink(sink: LogSink): void;
}

export interface LoggerOptions {
  /** Minimum level to emit. Defaults by environment (prod → warn, else → debug). */
  minLevel?: LogLevel;
  /** Sinks that receive emitted records. Defaults to the console sink. */
  sinks?: LogSink[];
}

/** Console sink — silent in production so Release builds stay quiet. */
export const consoleSink: LogSink = (level, message, context) => {
  if (appConfig.isProduction || typeof console === "undefined") {
    return;
  }
  const line = `[${LogLevel[level]}] ${message}`;
  if (level >= LogLevel.error) {
    console.error(line, context ?? "");
  } else if (level === LogLevel.warn) {
    console.warn(line, context ?? "");
  } else {
    console.info(line, context ?? "");
  }
};

export function createLogger(options: LoggerOptions = {}): Logger {
  const minLevel = options.minLevel ?? (appConfig.isProduction ? LogLevel.warn : LogLevel.debug);
  const sinks: LogSink[] = [...(options.sinks ?? [consoleSink])];

  function emit(level: LogLevel, message: string, context?: LogContext): void {
    if (level < minLevel) {
      return;
    }
    for (const sink of sinks) {
      try {
        sink(level, message, context);
      } catch {
        // A failing sink must never break the app.
      }
    }
  }

  return {
    debug: (m, c) => emit(LogLevel.debug, m, c),
    info: (m, c) => emit(LogLevel.info, m, c),
    warn: (m, c) => emit(LogLevel.warn, m, c),
    error: (m, c) => emit(LogLevel.error, m, c),
    addSink: (sink) => sinks.push(sink),
  };
}

/** Shared application logger (console sink, environment-gated level). */
export const logger: Logger = createLogger();
