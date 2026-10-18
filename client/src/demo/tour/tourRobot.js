// "Do it for me" (owner request, 2026-10-17; paced on the owner's PR #28 feedback,
// 2026-10-18): the tour drives the real screen the way a visitor would. It types into the
// real fields and presses the real buttons, so the action goes through the page's own
// form, mutation and adapter. It works at a pace the visitor can follow: text is typed
// quickly, and a choice, a tick or a press comes after a short pause, about 1–3 s for a
// whole step. Under reduced motion everything is filled at once, with no typing. Before
// working on a part of the screen it names that part (`area`), so the highlight follows
// it. It fills in only what the visitor left empty. Every wait gives up after a few
// seconds with an error the tooltip turns into a plain sentence; nothing is logged.

const WAIT_MS = 4000;
const PAUSE_MS = 300; // before a choice, a tick or a press, so the last change is seen
const TYPE_MS = 650; // typing one field, whatever its length…
const KEY_MS = { min: 8, max: 35 }; // …within these bounds per character
const STEP_MS = 30; // reduced motion: just long enough for the page to re-render

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Thrown when the tour moved on (Exit, a jump) while the robot was working. */
export class Cancelled extends Error {}

function visible(el) {
  if (!el?.isConnected) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

// React tracks an input's value itself; setting it through the prototype's setter and
// then firing the event is what makes React (and react-hook-form) see the change.
function setNativeValue(el, value) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
  el.dispatchEvent(
    new Event(el instanceof HTMLSelectElement ? "change" : "input", {
      bubbles: true,
    }),
  );
}

/**
 *   alive    false once the step is left: the robot stops at its next move
 *   reduced  prefers-reduced-motion: no pauses, no typing
 *   onArea   told which part of the screen the robot is about to change
 */
export function createRobot({
  alive = () => true,
  reduced = false,
  onArea = () => {},
} = {}) {
  const check = () => {
    if (!alive()) throw new Cancelled();
  };
  const pause = async (ms = PAUSE_MS) => {
    await sleep(reduced ? STEP_MS : ms);
    check();
  };

  /** The first visible match, waiting for it to appear. */
  async function waitFor(target, { root = document, timeout = WAIT_MS } = {}) {
    const start = Date.now();
    for (;;) {
      check();
      const matches =
        typeof target === "string"
          ? [...root.querySelectorAll(target)]
          : [target].filter(Boolean);
      const el = matches.find(visible);
      if (el) return el;
      if (Date.now() - start > timeout) throw new Error("not-found");
      await sleep(80);
    }
  }

  const bring = (el) => el.scrollIntoView?.({ block: "nearest" });

  return {
    waitFor,

    /** Moves the highlight to the part of the screen about to change. */
    async area(target) {
      onArea(target);
      await pause();
    },

    async click(target, options) {
      const el = await waitFor(target, options);
      bring(el);
      await pause(options?.pause);
      el.click();
      await pause(STEP_MS);
      return el;
    },

    // Radix menu triggers open on pointerdown, not click.
    async press(target, options) {
      const el = await waitFor(target, options);
      bring(el);
      await pause();
      el.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          button: 0,
          pointerType: "mouse",
        }),
      );
      await pause(STEP_MS);
      return el;
    },

    /** Types `value` unless the visitor already wrote something there. */
    async fill(target, value, options) {
      const el = await waitFor(target, options);
      if (el.value.trim() !== "") return el;
      bring(el);
      el.focus({ preventScroll: true });
      if (reduced) {
        setNativeValue(el, value);
      } else {
        // On a heavy form each keystroke re-renders the page; when typing falls behind
        // its time, a key press brings in the characters it owes.
        const perKey = Math.min(
          KEY_MS.max,
          Math.max(KEY_MS.min, TYPE_MS / value.length),
        );
        const begun = performance.now();
        const total = perKey * value.length;
        let typed = 0;
        while (typed < value.length) {
          const due = Math.ceil(
            ((performance.now() - begun) / total) * value.length,
          );
          typed = Math.min(value.length, Math.max(typed + 1, due));
          setNativeValue(el, value.slice(0, typed));
          await sleep(perKey);
          check();
        }
      }
      await pause(STEP_MS);
      return el;
    },

    /** Chooses `value` in a native select left on its placeholder. */
    async choose(target, value, options) {
      const el = await waitFor(target, options);
      if (el.value !== "") return el;
      bring(el);
      await pause(options?.pause);
      setNativeValue(el, value);
      return el;
    },

    /** Ticks a checkbox that isn't ticked. */
    async tick(target, options) {
      const el = await waitFor(target, options);
      if (el.checked) return el;
      bring(el);
      await pause();
      el.click();
      return el;
    },

    /** Opens a combobox with no value and picks its first real option. */
    async pickFirst(target, options) {
      const input = await waitFor(target, options);
      if (input.value.trim() !== "") return input;
      bring(input);
      input.click();
      const listId = input.getAttribute("aria-controls");
      const option = await waitFor(
        listId ? `[id="${listId}"] [role="option"]` : '[role="option"]',
      );
      await pause();
      option.click();
      await pause(STEP_MS);
      return input;
    },
  };
}

/** Closes the page's open dialogs and menus (never the tour's own), e.g. between steps. */
export async function closePageLayers() {
  const open = [
    ...document.querySelectorAll(
      '[role="dialog"][data-state="open"], [role="menu"][data-state="open"]',
    ),
  ].filter((el) => !el.closest("[data-tour-layer]"));
  if (open.length === 0) return;
  for (const layer of open) {
    const close = layer.querySelector('button[aria-label="Close"]');
    if (close && !close.disabled) close.click();
    else
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
  }
  await sleep(200);
}
