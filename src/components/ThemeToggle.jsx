import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import Button from "./UI/Button";
import { useTheme } from "../hooks/useTheme";

const THEME_STORAGE_KEY = "theme";

function readStoredTheme() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark" || stored === "light") {
      return stored;
    }
  } catch {
    // ignored on storage access issues
  }
  return null;
}

function ThemeToggle({ className = "" }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro";

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncWithSystem = (eventLike) => {
      if (readStoredTheme()) {
        return;
      }
      const matches = eventLike.matches;
      setTheme(matches ? "dark" : "light", { persist: false });
    };

    syncWithSystem(media);
    media.addEventListener?.("change", syncWithSystem) ?? media.addListener(syncWithSystem);
    return () => {
      media.removeEventListener?.("change", syncWithSystem) ?? media.removeListener(syncWithSystem);
    };
  }, [setTheme]);

  const handleToggle = () => {
    const next = isDark ? "light" : "dark";
    setTheme(next, { persist: true });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      aria-label={label}
      className={className}
      type="button"
      data-testid="theme-toggle"
    >
      <Icon aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </Button>
  );
}

export default ThemeToggle;
