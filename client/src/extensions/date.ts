/** Date formatting helpers. Domain entities store ISO-8601 strings; these turn
 *  them into localized, human-readable labels. */

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function nowIso(): string {
  return new Date().toISOString();
}

/** Local calendar date as `YYYY-MM-DD`, using the operator's timezone (built
 *  from local Date components — deliberately NOT `toISOString`, which is UTC and
 *  would show the wrong day near midnight). For live "current date" display. */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Local wall-clock time as `HH:mm` (no seconds), in the operator's timezone.
 *  For live "current time" display. */
export function formatLocalTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

/**
 * Human-readable elapsed duration from a millisecond span — the single format
 * for "время выполнения" across the app: «Ч ч ММ мин» for an hour or more,
 * «М мин» under an hour, «С с» under a minute. Returns «—» for missing/invalid
 * spans (e.g. a history record saved before timing was stored).
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) {
    return "—";
  }
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours} ч ${String(minutes).padStart(2, "0")} мин`;
  }
  if (minutes > 0) {
    return `${minutes} мин`;
  }
  return `${seconds} с`;
}

/** Elapsed time between two ISO timestamps, formatted via {@link formatDuration}. */
export function formatElapsed(startIso?: string | null, endIso?: string | null): string {
  if (!startIso || !endIso) {
    return "—";
  }
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return "—";
  }
  return formatDuration(end - start);
}
