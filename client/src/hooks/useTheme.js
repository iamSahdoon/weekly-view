import { useCallback, useState } from "react";

// The theme is per device (design §2.3): localStorage `wv.theme`, applied as
// <html data-theme>. index.html's inline script applies it before paint.

const KEY = "wv.theme";

function readTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function useTheme() {
  const [theme, setThemeState] = useState(readTheme);
  const setTheme = useCallback((next) => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Storage blocked: the choice lasts as long as the page.
    }
    setThemeState(next);
  }, []);
  return { theme, setTheme };
}
