import { useState } from "react";

/**
 * Whether this component mounted inside a view transition (owner decision, auth pages round
 * six): read once, at mount, so a page that arrived inside the cross-fade lets its parts
 * only rise — the cross-fade already fades them in — while a direct load, a refresh or a
 * browser without view transitions gets the full fade-and-rise. Never changes afterwards,
 * so an animation never switches half-way.
 */
export function useArrivedInTransition() {
  const [arrived] = useState(() => {
    try {
      return document.documentElement.matches(":active-view-transition");
    } catch {
      return false; // no DOM (tests) or a browser without the pseudo-class
    }
  });
  return arrived;
}
