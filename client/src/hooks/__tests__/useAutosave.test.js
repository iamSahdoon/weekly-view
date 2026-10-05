import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTOSAVE_DELAY, createAutosave } from "../useAutosave.js";

// The autosave's state machine (frontend_architecture.md §6.4, design §4.8), without
// React: 1200 ms after the last change, one request in flight, one trailing save with
// the latest values, and the four states. It has no way to raise a toast at all.

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup() {
  const calls = [];
  const states = [];
  let value = "a";
  const controller = createAutosave({
    savedAt: "2026-10-05T09:00:00.000Z",
    save: () => {
      const d = deferred();
      calls.push({ sent: value, ...d });
      return d.promise;
    },
    onChange: (s) => states.push(s.state),
  });
  return {
    controller,
    calls,
    states,
    type: (next) => {
      value = next;
      controller.touch();
    },
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("autosave", () => {
  it("starts idle with the report's savedAt", () => {
    const { controller } = setup();
    expect(controller.getSnapshot()).toEqual({
      state: "idle",
      savedAt: "2026-10-05T09:00:00.000Z",
    });
  });

  it("waits 1200 ms after the last change, then saves once", async () => {
    const { controller, calls, type } = setup();
    type("ab");
    expect(controller.getSnapshot().state).toBe("pending");
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY - 1);
    type("abc"); // the clock restarts
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY - 1);
    expect(calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls).toHaveLength(1);
    expect(calls[0].sent).toBe("abc");
    expect(controller.getSnapshot().state).toBe("saving");
    calls[0].resolve({ savedAt: "2026-10-05T14:32:00.000Z" });
    await vi.runAllTimersAsync();
    expect(controller.getSnapshot()).toEqual({
      state: "idle",
      savedAt: "2026-10-05T14:32:00.000Z",
    });
  });

  it("keeps one request in flight; edits during it go in one trailing save", async () => {
    const { controller, calls, type, states } = setup();
    type("ab");
    const flushed = controller.flush();
    expect(calls).toHaveLength(1);
    type("abc");
    type("abcd");
    expect(controller.getSnapshot().state).toBe("saving"); // not "pending" mid-flight
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY);
    expect(calls).toHaveLength(1); // still one in flight
    calls[0].resolve({ savedAt: "t1" });
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toHaveLength(2);
    expect(calls[1].sent).toBe("abcd");
    calls[1].resolve({ savedAt: "t2" });
    await expect(flushed).resolves.toBe(true);
    expect(controller.getSnapshot()).toEqual({ state: "idle", savedAt: "t2" });
    expect(states).toEqual(["pending", "saving", "saving", "idle"]);
  });

  it("a failure is 'failed', keeps the edits, and Retry sends them", async () => {
    const { controller, calls, type } = setup();
    type("ab");
    const first = controller.flush();
    calls[0].reject(new Error("offline"));
    await expect(first).resolves.toBe(false);
    expect(controller.getSnapshot().state).toBe("failed");
    // The edits are still held: Retry sends them as they were.
    const retried = controller.retry();
    expect(calls).toHaveLength(2);
    expect(calls[1].sent).toBe("ab");
    calls[1].resolve({ savedAt: "t" });
    await expect(retried).resolves.toBe(true);
    expect(controller.getSnapshot().state).toBe("idle");
  });

  it("flush with nothing to send resolves true and sends nothing", async () => {
    const { controller, calls } = setup();
    await expect(controller.flush()).resolves.toBe(true);
    expect(calls).toHaveLength(0);
  });

  it("retry is a no-op unless the last save failed", async () => {
    const { controller, calls } = setup();
    await expect(controller.retry()).resolves.toBe(true);
    expect(calls).toHaveLength(0);
  });
});
