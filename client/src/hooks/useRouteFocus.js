import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * After a navigation, focus moves to the page's <h1> (the top bar's title) so a
 * screen-reader user hears that the page changed (frontend_architecture.md §12).
 *
 * Only a change of *path* counts: filters, sort, page and week live in the URL's query and
 * moving focus on every keystroke of a search would be hostile. The first render is
 * skipped, and so is a page that has already put focus somewhere inside `#main` itself
 * (a form that focuses its first field). The <h1> is a stable element — pages portal
 * their title into it — so a lazy page arriving after its fallback does not lose focus.
 */
export function useRouteFocus() {
  const { pathname } = useLocation();
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current === pathname) return undefined;
    previous.current = pathname;
    const timer = setTimeout(() => {
      const active = document.activeElement;
      const main = document.getElementById("main");
      const placedByPage =
        main && active && active !== main && main.contains(active);
      if (placedByPage) return;
      const target = document.getElementById("page-title") ?? main;
      target?.focus({ preventScroll: true });
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]);
}
