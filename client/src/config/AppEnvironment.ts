/**
 * AppEnvironment — the runtime environment the app is executing in.
 *
 * Purpose: a single, typed source for environment-dependent behaviour
 * (logging verbosity, monitoring, diagnostics), so no module reads build flags
 * ad-hoc. Derived from Vite's `import.meta.env` at build time.
 *
 * Usage: `if (appEnvironment === AppEnvironment.production) …`.
 * Limits: read-only; determined by the build (`vite build` → production,
 * `vite dev` → development, `MODE=test` → test). Depends on: `import.meta.env`.
 */
export enum AppEnvironment {
  development = "development",
  test = "test",
  production = "production",
}

function detect(): AppEnvironment {
  // `import.meta.env` is injected by Vite; guarded for non-Vite runtimes (tests).
  const env = (import.meta as { env?: { MODE?: string; PROD?: boolean } }).env;
  if (!env) {
    return AppEnvironment.production;
  }
  if (env.MODE === "test") {
    return AppEnvironment.test;
  }
  return env.PROD ? AppEnvironment.production : AppEnvironment.development;
}

/** The current environment, resolved once at module load. */
export const appEnvironment: AppEnvironment = detect();

export const isProduction = appEnvironment === AppEnvironment.production;
export const isDevelopment = appEnvironment === AppEnvironment.development;
