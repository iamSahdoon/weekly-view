import { useEffect } from "react";

/** "{title} · WeeklyView" (frontend_architecture.md §7.3). */
export function useDocumentTitle(title) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} · WeeklyView`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
