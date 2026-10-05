import { useEffect, useRef, useState } from "react";

// The weekly form's autosave (frontend_architecture.md §6.4, design §4.8).
//
//   trigger      1200 ms after the last change; on blur (flush); on unmount, which is
//                every route change (flush)
//   concurrency  one request in flight; changes made during it are sent by one trailing
//                save with the latest values (`save` reads them when it runs)
//   states       idle · pending · saving · failed — "Saved 14:32" · "Unsaved changes" ·
//                "Saving…" · "Not saved" + Retry. Never a toast, either way.
//   failure      edits stay in memory; coming back online retries once
//
// The state machine is a plain controller so it can be tested without React.

export const AUTOSAVE_DELAY = 1200;

/**
 * `save()` sends the current values and resolves with `{ savedAt }`, or rejects.
 * `onChange(snapshot)` hears every state change. `flush()` resolves true when
 * everything typed so far is saved.
 */
export function createAutosave({
  save,
  delay = AUTOSAVE_DELAY,
  savedAt = null,
  onChange = () => {},
}) {
  let snapshot = { state: "idle", savedAt };
  let dirty = false;
  let timer = null;
  let inFlight = null;

  const set = (patch) => {
    snapshot = { ...snapshot, ...patch };
    onChange(snapshot);
  };
  const clearTimer = () => {
    clearTimeout(timer);
    timer = null;
  };

  async function run() {
    dirty = false;
    set({ state: "saving" });
    try {
      const result = await save();
      if (result?.savedAt) snapshot = { ...snapshot, savedAt: result.savedAt };
    } catch {
      dirty = true;
      set({ state: "failed" });
      return false;
    }
    // Changes made while the request was out: one trailing save.
    if (dirty) return run();
    set({ state: "idle" });
    return true;
  }

  function flush() {
    clearTimer();
    if (inFlight) return inFlight;
    if (!dirty) return Promise.resolve(snapshot.state !== "failed");
    inFlight = run().finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  /** Something changed: "Unsaved changes", and a save once typing pauses. */
  function touch() {
    dirty = true;
    if (!inFlight) set({ state: "pending" });
    clearTimer();
    timer = setTimeout(flush, delay);
  }

  /** The `Retry` button, and coming back online. */
  function retry() {
    return snapshot.state === "failed" ? flush() : Promise.resolve(true);
  }

  return {
    touch,
    flush,
    retry,
    getSnapshot: () => snapshot,
    cancel: clearTimer,
  };
}

/** The hook over the controller: `{ state, savedAt, touch, flush, retry }`. */
export function useAutosave({ save, savedAt }) {
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  const [snapshot, setSnapshot] = useState({ state: "idle", savedAt });
  const [controller] = useState(() =>
    createAutosave({
      save: () => saveRef.current(),
      savedAt,
      onChange: setSnapshot,
    }),
  );

  // Leaving the page (a route change, or the form's identity changing) saves what's
  // pending. StrictMode's extra unmount finds nothing to send.
  useEffect(() => () => void controller.flush(), [controller]);

  // Back online after a failed save: retry once.
  useEffect(() => {
    const onOnline = () => void controller.retry();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [controller]);

  return {
    ...snapshot,
    touch: controller.touch,
    flush: controller.flush,
    retry: controller.retry,
  };
}
