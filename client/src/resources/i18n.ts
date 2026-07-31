import { strings } from "./strings";

/**
 * Localization architecture.
 *
 * `strings.ts` is the single, complete catalog of user-facing copy — the web
 * analogue of `Localizable.strings` — and Russian is the primary language. This
 * module turns that catalog into a locale-aware source without forcing screens
 * to change: they still import `strings`, while `getStrings(locale)` provides
 * the same shape for any registered locale.
 *
 * Adding a language is a data-only change: drop a `DeepPartial<AppStrings>`
 * override into `overrides`. Anything a translation omits transparently falls
 * back to the Russian base, so a partial translation is always safe to ship.
 * English is registered and ready; its override starts empty (English currently
 * renders the Russian base) and is filled key-by-key over time.
 */
export type AppStrings = typeof strings;

export type Locale = "ru" | "en";

export const defaultLocale: Locale = "ru";

export const supportedLocales: ReadonlyArray<{ locale: Locale; title: string }> = [
  { locale: "ru", title: "Русский" },
  { locale: "en", title: "English" },
];

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/** Per-locale overrides layered onto the Russian base. Empty = full fallback. */
const overrides: Record<Locale, DeepPartial<AppStrings>> = {
  ru: {},
  en: {},
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge<T>(base: T, patch: DeepPartial<T>): T {
  if (!isObject(base) || !isObject(patch)) {
    return (patch as T) ?? base;
  }
  const result: Record<string, unknown> = { ...base };
  for (const key of Object.keys(patch)) {
    const patchValue = (patch as Record<string, unknown>)[key];
    if (patchValue === undefined) {
      continue;
    }
    result[key] = isObject(patchValue)
      ? deepMerge((base as Record<string, unknown>)[key], patchValue as DeepPartial<unknown>)
      : patchValue;
  }
  return result as T;
}

const LOCALE_STORAGE_KEY = "narezka.locale";

/** Resolves the full string catalog for a locale (Russian base + overrides). */
export function getStrings(locale: Locale = defaultLocale): AppStrings {
  return deepMerge(strings, overrides[locale]);
}

/** Reads the persisted UI locale, defaulting to the primary language. */
export function readLocale(): Locale {
  if (typeof window === "undefined") {
    return defaultLocale;
  }
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return stored === "ru" || stored === "en" ? stored : defaultLocale;
}

/** Persists the UI locale for the next launch. */
export function writeLocale(locale: Locale): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }
}
