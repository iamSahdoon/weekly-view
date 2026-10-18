// How the demo's chooser asks the tour layer for something (owner request, 2026-10-17):
// "start" the tour, or open the "panel". The layer is a separate chunk that may still be
// loading when the visitor clicks, so a request made before it listens waits for it. The
// demo bar, which lives in the main bundle, sends the same requests as a DOM event instead
// (TOUR_EVENT), so no tour code reaches the real app.

export const TOUR_EVENT = "weeklyview:tour";

let listener = null;
let pending = null;

export function requestTour(action) {
  if (listener) listener(action);
  else pending = action;
}

export function onTourRequest(fn) {
  listener = fn;
  if (pending) {
    const action = pending;
    pending = null;
    fn(action);
  }
  return () => {
    if (listener === fn) listener = null;
  };
}
