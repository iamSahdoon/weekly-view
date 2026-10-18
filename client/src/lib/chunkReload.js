// A page whose chunk is gone after a redeploy (frontend_architecture.md §4.3, owner
// decision, PR #30 review, 2026-10-18). Each deploy names its chunks by content hash, so a
// tab opened before it asks for files the new deploy doesn't have, and the SPA rewrite
// answers with index.html: the dynamic import fails. Reloading fetches the new build. The
// guard is a timestamp in sessionStorage: one reload per tab within RETRY_WINDOW_MS, so a
// chunk that is still missing after the reload shows the page's error state instead of
// looping. With storage blocked there is no guard, so there is no reload either.

export const RELOAD_KEY = "wv.chunkReloadAt";
export const RETRY_WINDOW_MS = 30_000;

// Chrome / Edge, Firefox, Safari, and Vite's preload helper (a CSS or dependency file).
const CHUNK_ERROR =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|'text\/html' is not a valid JavaScript MIME type/i;

export function isChunkLoadError(error) {
  return (
    error?.name === "ChunkLoadError" || CHUNK_ERROR.test(String(error?.message))
  );
}

/**
 * Reloads the page for a chunk-load error unless this tab already did so within the
 * window. Returns true when a reload was started. `deps` replaces sessionStorage, the clock
 * and the reload in tests.
 */
export function reloadOnceForChunk(error, deps = {}) {
  if (!isChunkLoadError(error)) return false;
  const now = deps.now ?? Date.now;
  try {
    // Reading sessionStorage itself throws where storage is blocked.
    const storage = deps.storage ?? globalThis.sessionStorage;
    const last = Number(storage.getItem(RELOAD_KEY));
    if (last && now() - last < RETRY_WINDOW_MS) return false;
    storage.setItem(RELOAD_KEY, String(now()));
  } catch {
    return false; // no storage, no guard: never risk a loop
  }
  (deps.reload ?? (() => globalThis.location.reload()))();
  return true;
}

/**
 * Wraps a page's import: a missing chunk reloads the page once (the promise then never
 * settles, so the route's fallback stays up until the reload); any other failure, or a
 * second one within the window, rejects as before and reaches the error boundary.
 */
export function guardChunkLoad(loader, deps) {
  return () =>
    loader().catch((error) => {
      if (reloadOnceForChunk(error, deps)) return new Promise(() => {});
      throw error;
    });
}
