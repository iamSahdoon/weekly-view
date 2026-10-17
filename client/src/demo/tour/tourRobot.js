// "Do it for me" (owner request, 2026-10-17): the tour drives the real screen the way a
// visitor would — it presses the real buttons and types into the real fields — so what
// it does goes through the page's own form, mutation and adapter, and the visitor sees
// it happen. Only what the visitor left empty is filled in. Every wait gives up after a
// few seconds with an error the tooltip turns into a plain sentence; nothing is logged.

const WAIT_MS = 4000;
// A short beat between actions, so each change can be seen.
const BEAT_MS = 160;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const find = (target, root = document) =>
  typeof target === "string" ? root.querySelector(target) : target;

function visible(el) {
  if (!el?.isConnected) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/** The first visible match, waiting for it to appear. */
async function waitFor(target, { root = document, timeout = WAIT_MS } = {}) {
  const start = Date.now();
  for (;;) {
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

export const robot = {
  waitFor,
  beat: () => sleep(BEAT_MS),

  async click(target, options) {
    const el = await waitFor(target, options);
    el.scrollIntoView?.({ block: "nearest" });
    el.click();
    await sleep(BEAT_MS);
    return el;
  },

  // Radix menu triggers open on pointerdown, not click.
  async press(target, options) {
    const el = await waitFor(target, options);
    el.scrollIntoView?.({ block: "nearest" });
    el.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        button: 0,
        pointerType: "mouse",
      }),
    );
    await sleep(BEAT_MS);
    return el;
  },

  /** Types `value` unless the visitor already wrote something there. */
  async fill(target, value, options) {
    const el = await waitFor(target, options);
    if (el.value.trim() !== "") return el;
    el.focus({ preventScroll: true });
    setNativeValue(el, value);
    await sleep(BEAT_MS);
    return el;
  },

  /** Chooses `value` in a native select left on its placeholder. */
  async choose(target, value, options) {
    const el = await waitFor(target, options);
    if (el.value !== "") return el;
    setNativeValue(el, value);
    await sleep(BEAT_MS);
    return el;
  },

  /** Ticks a checkbox that isn't ticked. */
  async tick(target, options) {
    const el = await waitFor(target, options);
    if (!el.checked) el.click();
    await sleep(BEAT_MS);
    return el;
  },

  /** Opens a combobox with no value and picks its first real option. */
  async pickFirst(target, options) {
    const input = await waitFor(target, options);
    if (input.value.trim() !== "") return input;
    input.click();
    const listId = input.getAttribute("aria-controls");
    const option = await waitFor(
      listId ? `[id="${listId}"] [role="option"]` : '[role="option"]',
    );
    option.click();
    await sleep(BEAT_MS);
    return input;
  },

  find,
};

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
