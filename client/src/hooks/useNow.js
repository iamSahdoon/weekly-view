import { useMemo, useSyncExternalStore } from "react";

// One shared ticker for every comment countdown on screen (frontend_architecture.md
// §8.3): a module-level setInterval that runs only while something subscribes, so
// fifty "9 min left" labels read the same clock instead of starting fifty timers.
// The countdown is informative; the server enforces the 10-minute window.

const subscribers = new Map(); // listener → the interval it asked for
let timer = null;
let timerMs = 0;
let current = Date.now();

function tick() {
  current = Date.now();
  for (const listener of subscribers.keys()) listener();
}

// The ticker runs at the shortest interval anyone asked for.
function retime() {
  const wanted = subscribers.size ? Math.min(...subscribers.values()) : 0;
  if (wanted === timerMs) return;
  clearInterval(timer);
  timer = wanted ? setInterval(tick, wanted) : null;
  timerMs = wanted;
}

function subscribeWith(intervalMs) {
  return (listener) => {
    subscribers.set(listener, intervalMs);
    retime();
    return () => {
      subscribers.delete(listener);
      retime();
    };
  };
}

// While nobody is subscribed `current` can be stale; refresh it, but only when it
// has aged, so two reads inside one render return the same value.
function getSnapshot() {
  if (subscribers.size === 0 && Date.now() - current > 1000) {
    current = Date.now();
  }
  return current;
}

/** The current time in ms, re-read every `intervalMs` (default 15 s) while mounted. */
export function useNow(intervalMs = 15_000) {
  // Stable per interval: a new function each render would resubscribe each render.
  const subscribe = useMemo(() => subscribeWith(intervalMs), [intervalMs]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
