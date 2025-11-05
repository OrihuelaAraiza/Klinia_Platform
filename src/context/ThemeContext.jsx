import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ThemeContext } from "./theme-context";

function resolveInitialTheme() {
  if (typeof window === "undefined") {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", "light");
    }
    return { theme: "light", explicit: false };
  }

  let storedTheme = null;
  try {
    storedTheme = window.localStorage.getItem("theme");
  } catch {
    storedTheme = null;
  }
  const explicit = storedTheme === "light" || storedTheme === "dark";
  let resolved = explicit ? storedTheme : null;

  if (!resolved) {
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
    resolved = prefersDark ? "dark" : "light";
  }

  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.style.colorScheme = resolved === "dark" ? "dark" : "light";
  }

  return { theme: resolved, explicit };
}

export function ThemeProvider({ children }) {
  const initial = useMemo(() => resolveInitialTheme(), []);
  const [theme, setThemeState] = useState(initial.theme);
  const hasExplicitPreference = useRef(initial.explicit);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
      document.documentElement.style.colorScheme = theme === "dark" ? "dark" : "light";
    }
    if (typeof window !== "undefined") {
      try {
        if (hasExplicitPreference.current) {
          window.localStorage.setItem("theme", theme);
        } else {
          window.localStorage.removeItem("theme");
        }
      } catch {
        // ignore storage errors
      }
    }
  }, [theme]);

  const applyTheme = useCallback((nextTheme, { persist = true } = {}) => {
    hasExplicitPreference.current = persist;
    setThemeState(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    hasExplicitPreference.current = true;
    setThemeState((current) => (current === "light" ? "dark" : "light"));
  }, []);

  const setTheme = useCallback(
    (nextTheme, options = {}) => {
      const persist = options.persist ?? true;
      applyTheme(nextTheme, { persist });
    },
    [applyTheme]
  );

  const resetToSystemTheme = useCallback(() => {
    hasExplicitPreference.current = false;
    if (typeof window !== "undefined" && window.matchMedia) {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setThemeState(prefersDark ? "dark" : "light");
    } else {
      setThemeState("light");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event) => {
      if (hasExplicitPreference.current) {
        return;
      }
      setThemeState(event.matches ? "dark" : "light");
    };
    if (!hasExplicitPreference.current) {
      setThemeState(media.matches ? "dark" : "light");
    }
    media.addEventListener?.("change", handleChange) ?? media.addListener(handleChange);
    return () => {
      media.removeEventListener?.("change", handleChange) ?? media.removeListener(handleChange);
    };
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      resetToSystemTheme,
      toggleTheme,
    }),
    [setTheme, theme, toggleTheme, resetToSystemTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
