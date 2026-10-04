import { useSyncExternalStore } from "react";

// One matchMedia subscription per distinct query (frontend_architecture.md §7.4).
// Used only where a breakpoint changes the DOM; spacing and type use Tailwind.

const entries = new Map();

function entryFor(query) {
  let entry = entries.get(query);
  if (!entry) {
    const list = window.matchMedia(query);
    entry = { list, listeners: new Set(), matches: list.matches };
    const onChange = () => {
      entry.matches = list.matches;
      entry.listeners.forEach((listener) => listener());
    };
    entry.attach = () => list.addEventListener("change", onChange);
    entry.detach = () => list.removeEventListener("change", onChange);
    entries.set(query, entry);
  }
  return entry;
}

function subscribe(query, listener) {
  const entry = entryFor(query);
  if (entry.listeners.size === 0) {
    entry.matches = entry.list.matches;
    entry.attach();
  }
  entry.listeners.add(listener);
  return () => {
    entry.listeners.delete(listener);
    if (entry.listeners.size === 0) entry.detach();
  };
}

export function useMediaQuery(query) {
  return useSyncExternalStore(
    (listener) => subscribe(query, listener),
    () => entryFor(query).list.matches,
    () => false,
  );
}
