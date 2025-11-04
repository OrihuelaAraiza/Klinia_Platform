import { useCallback, useEffect, useMemo, useState } from "react";
import { ThemeContext } from "./theme-context";

function getInitialTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem("theme");
  let resolved = stored === "light" || stored === "dark" ? stored : null;

  if (!resolved) {
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
    resolved = prefersDark ? "dark" : "light";
  }

  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", resolved);
  }

  return resolved;
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem("theme", theme);
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
