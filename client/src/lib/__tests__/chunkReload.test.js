import { describe, expect, it, vi } from "vitest";
import {
  RELOAD_KEY,
  RETRY_WINDOW_MS,
  guardChunkLoad,
  isChunkLoadError,
  reloadOnceForChunk,
} from "../chunkReload.js";

// Owner decision (PR #30 review, 2026-10-18): a page whose chunk is gone after a redeploy
// reloads once, guarded so it can never loop.

const CHROME = new TypeError(
  "Failed to fetch dynamically imported module: https://weeklyview.vercel.app/assets/ReviewPage-abc123.js",
);
const FIREFOX = new TypeError("error loading dynamically imported module");
const SAFARI = new TypeError("Importing a module script failed.");

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    map,
  };
}
function deps(start = 1_000_000) {
  let t = start;
  return {
    storage: fakeStorage(),
    now: () => t,
    advance: (ms) => (t += ms),
    reload: vi.fn(),
  };
}

describe("isChunkLoadError", () => {
  it("knows the three browsers' messages and Vite's preload error", () => {
    for (const e of [
      CHROME,
      FIREFOX,
      SAFARI,
      new Error("Unable to preload CSS for /assets/x.css"),
    ])
      expect(isChunkLoadError(e)).toBe(true);
  });
  it("ignores every other error", () => {
    expect(isChunkLoadError(new Error("Network Error"))).toBe(false);
    expect(isChunkLoadError(new TypeError("x is not a function"))).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});

describe("reloadOnceForChunk", () => {
  it("reloads once, then lets the error through within the window", () => {
    const d = deps();
    expect(reloadOnceForChunk(CHROME, d)).toBe(true);
    expect(d.reload).toHaveBeenCalledTimes(1);
    expect(d.storage.map.get(RELOAD_KEY)).toBe(String(d.now()));
    // The page reloaded and the chunk is still missing: no second reload.
    d.advance(2_000);
    expect(reloadOnceForChunk(CHROME, d)).toBe(false);
    d.advance(RETRY_WINDOW_MS - 2_001);
    expect(reloadOnceForChunk(SAFARI, d)).toBe(false);
    expect(d.reload).toHaveBeenCalledTimes(1);
  });

  it("allows a reload again once the window has passed (a later deploy)", () => {
    const d = deps();
    reloadOnceForChunk(CHROME, d);
    d.advance(RETRY_WINDOW_MS);
    expect(reloadOnceForChunk(CHROME, d)).toBe(true);
    expect(d.reload).toHaveBeenCalledTimes(2);
  });

  it("never reloads for other errors", () => {
    const d = deps();
    expect(reloadOnceForChunk(new Error("Network Error"), d)).toBe(false);
    expect(d.reload).not.toHaveBeenCalled();
    expect(d.storage.map.size).toBe(0);
  });

  it("never reloads when storage is blocked, so it can't loop", () => {
    const d = deps();
    const blocked = {
      getItem() {
        throw new DOMException("blocked", "SecurityError");
      },
      setItem() {
        throw new DOMException("blocked", "SecurityError");
      },
    };
    expect(reloadOnceForChunk(CHROME, { ...d, storage: blocked })).toBe(false);
    const full = {
      getItem: () => null,
      setItem() {
        throw new DOMException("full", "QuotaExceededError");
      },
    };
    expect(reloadOnceForChunk(CHROME, { ...d, storage: full })).toBe(false);
    expect(d.reload).not.toHaveBeenCalled();
  });
});

describe("guardChunkLoad", () => {
  it("passes a successful load through", async () => {
    const d = deps();
    const mod = { default: () => null };
    await expect(guardChunkLoad(() => Promise.resolve(mod), d)()).resolves.toBe(
      mod,
    );
    expect(d.reload).not.toHaveBeenCalled();
  });

  it("reloads on a missing chunk and keeps the fallback up (the promise stays pending)", async () => {
    const d = deps();
    const settled = vi.fn();
    guardChunkLoad(() => Promise.reject(CHROME), d)().then(settled, settled);
    await new Promise((r) => setTimeout(r, 10));
    expect(d.reload).toHaveBeenCalledTimes(1);
    expect(settled).not.toHaveBeenCalled();
  });

  it("rejects, for the error boundary, when the chunk is still missing after the reload", async () => {
    const d = deps();
    d.storage.setItem(RELOAD_KEY, String(d.now() - 1_000));
    await expect(
      guardChunkLoad(() => Promise.reject(CHROME), d)(),
    ).rejects.toBe(CHROME);
    expect(d.reload).not.toHaveBeenCalled();
  });

  it("rejects other failures unchanged", async () => {
    const d = deps();
    const boom = new Error("boom");
    await expect(guardChunkLoad(() => Promise.reject(boom), d)()).rejects.toBe(
      boom,
    );
    expect(d.reload).not.toHaveBeenCalled();
  });
});
