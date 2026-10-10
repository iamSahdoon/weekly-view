import { useEffect } from "react";

/**
 * A page always prints on the light theme (design §3.4: a white page), whichever theme the
 * screen is in. The tokens stay single-sourced — nothing in the print stylesheet restates
 * a dark colour — by switching `<html data-theme>` for the duration of the print and
 * switching it back after. `beforeprint` / `afterprint` also fire for Ctrl+P and the
 * browser's own menu, not only for `window.print()`.
 */
export function usePrintTheme() {
  useEffect(() => {
    const root = document.documentElement;
    let restore = null;
    const before = () => {
      if (root.dataset.theme === "dark") {
        restore = "dark";
        root.dataset.theme = "light";
      }
    };
    const after = () => {
      if (restore) {
        root.dataset.theme = restore;
        restore = null;
      }
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
      after();
    };
  }, []);
}
