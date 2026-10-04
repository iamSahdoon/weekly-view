import { useCallback, useState } from "react";
import { useMediaQuery } from "./useMediaQuery.js";

// The sidebar's mode is decided in JS because it changes the DOM
// (frontend_architecture.md §7.2, §7.4; design §10):
//   full   ≥ 1280px
//   rail   1024–1279px, or collapsed by choice
//   drawer < 1024px, off-canvas, opened from the top bar
// A manual choice, once made, wins over the automatic rail.

const KEY = "wv.nav.collapsed";

function readChoice() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw === "true" ? true : raw === "false" ? false : null;
  } catch {
    return null;
  }
}

export function useShellMode() {
  const isDrawer = useMediaQuery("(max-width: 1023px)");
  const autoRail = useMediaQuery("(max-width: 1279px)");
  const [choice, setChoice] = useState(readChoice);

  const collapsed = choice ?? autoRail;
  const mode = isDrawer ? "drawer" : collapsed ? "rail" : "full";

  const toggleCollapsed = useCallback(() => {
    const next = !collapsed;
    setChoice(next);
    try {
      localStorage.setItem(KEY, String(next));
    } catch {
      // Storage blocked: the choice lasts as long as the page.
    }
  }, [collapsed]);

  return { mode, toggleCollapsed };
}
