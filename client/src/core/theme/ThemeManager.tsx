import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ColorScheme } from "./theme";

const STORAGE_KEY = "narezka.theme.colorScheme";

type ThemePreference = ColorScheme | "system";

interface ThemeContextValue {
  /** The user preference, including "system" which follows the OS setting. */
  preference: ThemePreference;
  /** The effective scheme actually applied to the document. */
  colorScheme: ColorScheme;
  isDark: boolean;
  setPreference: (preference: ThemePreference) => void;
  setDark: (dark: boolean) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredPreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveScheme(preference: ThemePreference): ColorScheme {
  if (preference === "system") {
    return systemPrefersDark() ? "dark" : "light";
  }
  return preference;
}

/**
 * Owns the application colour scheme. It is the single source of truth for
 * Light/Dark mode: the Settings screen and the header toggle both flow through
 * here, so appearance never drifts between screens.
 */
export function ThemeManager({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(
    readStoredPreference,
  );
  const [colorScheme, setColorScheme] = useState<ColorScheme>(() =>
    resolveScheme(readStoredPreference()),
  );

  useEffect(() => {
    setColorScheme(resolveScheme(preference));
  }, [preference]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    if (preference !== "system") {
      return;
    }
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => setColorScheme(systemPrefersDark() ? "dark" : "light");
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, [preference]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", colorScheme === "dark");
  }, [colorScheme]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const setDark = useCallback(
    (dark: boolean) => setPreference(dark ? "dark" : "light"),
    [setPreference],
  );

  const toggle = useCallback(
    () => setDark(colorScheme !== "dark"),
    [colorScheme, setDark],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      colorScheme,
      isDark: colorScheme === "dark",
      setPreference,
      setDark,
      toggle,
    }),
    [preference, colorScheme, setPreference, setDark, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeManager provider");
  }
  return context;
}
