import { useCallback, useEffect, useRef, useState } from "react";

/** Version baked into the running bundle at build time. */
export const APP_VERSION: string =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

/** Fetch the deployed version from `version.json`, cache-busted so the newest
 *  deploy is always seen. Returns `null` if it cannot be determined. */
async function fetchDeployedVersion(): Promise<string | null> {
  try {
    const url = `${import.meta.env.BASE_URL}version.json?t=${Date.now()}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    const data: unknown = await response.json();
    const version = (data as { version?: unknown } | null)?.version;
    return typeof version === "string" ? version : null;
  } catch {
    return null;
  }
}

export interface AppUpdateState {
  /** Version of the running app. */
  current: string;
  /** Latest deployed version, once checked (null if unknown). */
  latest: string | null;
  /** True when the deployed version differs from the running one. */
  hasUpdate: boolean;
  /** A check has completed at least once. */
  checkedOnce: boolean;
  /** A check is in progress. */
  checking: boolean;
  /** Run a version check; resolves to the deployed version (or null). */
  check: () => Promise<string | null>;
  /** Clear caches / worker and hard-reload to load the new version. */
  applyUpdate: () => Promise<void>;
}

/**
 * Detects when a newer version of the app has been deployed and lets the caller
 * apply it. Compares the build-time {@link APP_VERSION} against the deployed
 * `version.json`. Purely additive — it changes no business logic, only checks a
 * static file and (on apply) reloads the page.
 */
export function useAppUpdate(options?: { autoCheck?: boolean }): AppUpdateState {
  const [latest, setLatest] = useState<string | null>(null);
  const [checkedOnce, setCheckedOnce] = useState(false);
  const [checking, setChecking] = useState(false);
  const inFlight = useRef(false);

  const check = useCallback(async (): Promise<string | null> => {
    if (inFlight.current) {
      return latest;
    }
    inFlight.current = true;
    setChecking(true);
    try {
      const version = await fetchDeployedVersion();
      setLatest(version);
      setCheckedOnce(true);
      return version;
    } finally {
      setChecking(false);
      inFlight.current = false;
    }
  }, [latest]);

  const applyUpdate = useCallback(async (): Promise<void> => {
    // Drop any caches / service worker so the reload pulls the fresh build.
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.update().catch(() => undefined)));
      }
      if (typeof caches !== "undefined") {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch {
      // Best-effort cleanup — reload regardless.
    }
    window.location.reload();
  }, []);

  useEffect(() => {
    if (options?.autoCheck) {
      void check();
    }
    // Only auto-check on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasUpdate = latest !== null && latest !== APP_VERSION;
  return { current: APP_VERSION, latest, hasUpdate, checkedOnce, checking, check, applyUpdate };
}
