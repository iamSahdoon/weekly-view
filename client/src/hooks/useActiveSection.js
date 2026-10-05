import { useEffect, useState } from "react";

// The form rail's "current" section (design §4.2, frontend_architecture.md §6.4): the
// first section, in order, that is inside the band under the sticky top bar. One
// IntersectionObserver for all of them. Elements are found by id, so a section only
// has to render `id={…}`.

const BAND = "-94px 0px -55% 0px";

export function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0] ?? null);
  const key = ids.join(",");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const order = key.split(",");
    const visible = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const first = order.find((id) => visible.has(id));
        if (first) setActive(first);
      },
      { rootMargin: BAND },
    );
    for (const id of order) {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, [key]);

  return active;
}
