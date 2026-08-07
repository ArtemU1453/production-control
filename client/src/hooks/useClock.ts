import { useEffect, useState } from "react";

/**
 * Live wall-clock hook.
 *
 * Returns the current {@link Date}, refreshed on an interval so any UI that
 * shows the *current* time stays in sync with the operator's computer clock —
 * in the machine's local timezone, straight from the browser's `Date` (never
 * UTC, a server, or a stored value). One interval is created per mount and
 * cleared on unmount, so there are no leaks and never two parallel timers for
 * the same view. The value is seeded synchronously on mount (immediate correct
 * display, no first-tick delay) and also refreshes the moment the tab regains
 * visibility, so returning to the page shows the accurate time at once — and if
 * the OS clock or day changes, the next tick reflects it.
 *
 * This is the CURRENT interface time only. It must NOT be used for historical
 * production-event timestamps (order start, completion, defects, Jumbo changes),
 * which are fixed points in time and stay as recorded.
 */
export function useClock(intervalMs: number = 1000): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick(); // sync immediately on mount, don't wait for the first interval
    const id = window.setInterval(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);

  return now;
}
