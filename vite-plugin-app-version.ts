import { execSync } from "node:child_process";
import type { Plugin } from "vite";

/**
 * Stamps the build with a version identifier so the running app can detect when
 * a newer version has been deployed.
 *
 * - Defines the `__APP_VERSION__` global (the short commit SHA, or a timestamp
 *   fallback) — baked into the bundle at build time.
 * - Emits `version.json` (`{ version, builtAt }`) at the site root, which the app
 *   fetches (cache-busted) on startup and compares against `__APP_VERSION__`.
 *   When they differ, a new deploy is available and the app prompts to reload.
 *
 * This gives reliable auto-update on a static GitHub Pages deploy without a
 * caching service worker (assets are content-hashed, so a reload pulls the new
 * bundle straight from Pages).
 */
function resolveVersion(): string {
  try {
    return execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return `build-${Date.now()}`;
  }
}

export function appVersionPlugin(): Plugin {
  const version = resolveVersion();
  const builtAt = new Date().toISOString();
  return {
    name: "app-version",
    config() {
      return {
        define: {
          __APP_VERSION__: JSON.stringify(version),
        },
      };
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ version, builtAt }, null, 2),
      });
    },
  };
}
