/**
 * Active production time.
 *
 * The «Время выполнения» of a run is the SUM of the intervals during which
 * production was actually running — every paused period is fully excluded. This
 * walks the pause/resume events between the run's start and end and accumulates
 * only the running stretches. Pure and side-effect free so it can be reused
 * (and unit-tested) from the ViewModel and any report.
 */

/** A pause/resume event with its ISO timestamp. Other journal kinds are ignored. */
export interface DurationToggle {
  kind: string;
  at: string;
}

/**
 * Sum of running intervals between `startIso` and `endIso`, excluding pauses.
 *
 * Production is considered running from `startIso`; a `pause` event stops the
 * clock and a `resume` event restarts it. If the run ends while paused (paused
 * then completed without a resume), the tail from the last pause to the end is
 * NOT counted. Returns milliseconds, or `null` when start/end are missing or
 * invalid (so callers can show «—» for records without timing data).
 */
export function computeActiveDurationMs(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
  events: readonly DurationToggle[],
): number | null {
  if (!startIso || !endIso) {
    return null;
  }
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return null;
  }

  const toggles = events
    .filter((e) => e.kind === "pause" || e.kind === "resume")
    .map((e) => ({ kind: e.kind, at: new Date(e.at).getTime() }))
    .filter((e) => !Number.isNaN(e.at) && e.at >= start && e.at <= end)
    .sort((a, b) => a.at - b.at);

  let active = 0;
  let running = true; // production is running from `start`
  let runStart = start;
  for (const toggle of toggles) {
    if (toggle.kind === "pause" && running) {
      active += toggle.at - runStart;
      running = false;
    } else if (toggle.kind === "resume" && !running) {
      running = true;
      runStart = toggle.at;
    }
  }
  if (running) {
    active += end - runStart;
  }
  return Math.max(0, active);
}
