import { cn } from "../../lib/cn.js";
import { formatTime } from "../../lib/format.js";

// Where the autosave says what it is doing (design §4.8): the left of the sticky bar,
// the same place every time, 12px --mut, no spinner, never a toast. "Draft" is a
// status, not a save state — it says "Saved 14:32", never "Draft saved".
//
// Polish (2026-10-10): a 6px square leads the words in the Updates squares' language —
// hollow while there is something to save or it is saving, solid cobalt once saved —
// and each new state fades in (120ms) rather than snapping, so the eye catches the
// change without being pulled to it.

export function AutosaveIndicator({ state, savedAt, onRetry }) {
  const saved = state === "idle" && savedAt;
  const square =
    state === "saving" || state === "pending"
      ? "hollow"
      : saved
        ? "solid"
        : null;
  return (
    <p
      aria-live="polite"
      className="flex items-center gap-6 text-caption text-mut"
    >
      {square && (
        <span
          aria-hidden="true"
          data-testid="autosave-square"
          className={cn(
            "size-[6px] shrink-0 border transition-colors duration-[160ms] ease-linear",
            square === "solid"
              ? "border-acc bg-acc"
              : "border-mut bg-transparent",
          )}
        />
      )}
      <span key={state} className="wv-fade-in flex items-center gap-6">
        {state === "saving" && "Saving…"}
        {state === "pending" && "Unsaved changes"}
        {saved && (
          <>
            Saved <span className="font-mono">{formatTime(savedAt)}</span>
          </>
        )}
        {state === "failed" && (
          <>
            <span className="text-st-corr-fg">Not saved</span>
            <button
              type="button"
              onClick={onRetry}
              className="focus-halo font-medium text-acc-txt underline-offset-2 hover:underline"
            >
              Retry
            </button>
          </>
        )}
      </span>
    </p>
  );
}
