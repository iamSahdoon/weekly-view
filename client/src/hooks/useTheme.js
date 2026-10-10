import { useCallback, useState } from "react";

// The theme is per device (design §2.3): localStorage `wv.theme`, applied as
// <html data-theme>. index.html's inline script applies it before paint.
//
// Polish (2026-10-10): a switch the person makes eases over 200ms instead of flashing
// (base.css, `.wv-theme-easing`), the class removed once it has run. It is colour
// only, so it stays under reduced motion: a gentle cross-fade is kinder to the eyes
// than a full-screen brightness jump.

let easingTimer;

const KEY = "wv.theme";

function readTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function useTheme() {
  const [theme, setThemeState] = useState(readTheme);
  const setTheme = useCallback((next) => {
    const root = document.documentElement;
    root.classList.add("wv-theme-easing");
    clearTimeout(easingTimer);
    easingTimer = setTimeout(
      () => root.classList.remove("wv-theme-easing"),
      260,
    );
    root.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Storage blocked: the choice lasts as long as the page.
    }
    setThemeState(next);
  }, []);
  return { theme, setTheme };
}
