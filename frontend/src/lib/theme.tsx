"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Empty subscriptions — useSyncExternalStore only needs the server snapshot to
// stay "light" until hydration, then the client snapshot takes over. We don't
// subscribe to cross-tab changes, so these are no-ops.
const emptySubscribe = () => () => {};

function getStoredTheme(): Theme {
  const stored = localStorage.getItem("zen-theme") as Theme | null;
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // SSR renders "light"; the client snapshot resolves the real preference
  // after hydration without calling setState during render's effect.
  const initialTheme = useSyncExternalStore(
    emptySubscribe,
    getStoredTheme, // client snapshot
    () => "light" as Theme, // server snapshot
  );
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("zen-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
