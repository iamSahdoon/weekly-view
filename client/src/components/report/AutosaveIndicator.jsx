import { formatTime } from "../../lib/format.js";

// Where the autosave says what it is doing (design §4.8): the left of the sticky bar,
// the same place every time, 12px --mut, no spinner, never a toast. "Draft" is a
// status, not a save state — it says "Saved 14:32", never "Draft saved".

export function AutosaveIndicator({ state, savedAt, onRetry }) {
  return (
    <p
      aria-live="polite"
      className="flex items-center gap-6 text-caption text-mut"
    >
      {state === "saving" && "Saving…"}
      {state === "pending" && "Unsaved changes"}
      {state === "idle" && savedAt && (
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
    </p>
  );
}
