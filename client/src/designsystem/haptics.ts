/**
 * haptics — semantic tactile feedback for meaningful actions.
 *
 * Purpose: give physical confirmation for significant outcomes (save, delete,
 * cutting complete, report sent, warnings, errors) — never on every tap. The web
 * analogue of UIKit's feedback generators is the Vibration API; each semantic
 * method maps to a short, distinct pattern.
 *
 * Usage: `haptics.success()` after a successful save; `haptics.warning()` on an
 * error/alert; `haptics.impact()` on a confirmed destructive action.
 *
 * Limits: no-op where the Vibration API is unavailable (most desktops, iOS
 * Safari) and **suppressed when the user prefers reduced motion**, so it never
 * fights accessibility settings. It is best-effort feedback, not a guarantee.
 * Depends on: `navigator.vibrate`, `prefers-reduced-motion`.
 */

type Pattern = number | number[];

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function vibrate(pattern: Pattern): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return;
  }
  if (reducedMotion()) {
    return;
  }
  try {
    navigator.vibrate(pattern);
  } catch {
    // Best-effort — ignore unsupported/blocked vibration.
  }
}

export const haptics = {
  /** Light tick for selection changes. */
  selection(): void {
    vibrate(8);
  },
  /** Single impact for a confirmed action (e.g. delete, close Jumbo). */
  impact(): void {
    vibrate(15);
  },
  /** Success — save, cutting complete, report sent. */
  success(): void {
    vibrate([12, 40, 12]);
  },
  /** Warning / error — validation failure, send failure, alerts. */
  warning(): void {
    vibrate([25, 40, 25, 40, 25]);
  },
} as const;

export type HapticKind = keyof typeof haptics;
