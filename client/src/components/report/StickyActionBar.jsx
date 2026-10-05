import { useId, useState } from "react";
import { cn } from "../../lib/cn.js";
import { Button } from "../ui/Button.jsx";
import { Tooltip } from "../ui/Tooltip.jsx";
import { AutosaveIndicator } from "./AutosaveIndicator.jsx";

// The weekly form's sticky bar (design §4.9): 62px, --card, a 1px --hair top, stuck to
// the bottom of the form column. Left, the save indicator; right, "Ask for approval",
// secondary `Save` and the one primary, `Submit` (`Resubmit` when correcting). Below
// 768px it spans the viewport, grows to 88px and puts the checkbox and the save state on
// their own line above equal-width buttons, with the checklist's reason above it all.
//
// `Submit` is disabled until the checklist is met — `aria-disabled`, so it stays
// focusable, its tooltip names what is missing ("Wednesday has no update."), and a click
// takes the person to the problem instead of sending anything (ReportForm decides).
// The checkbox's state lives here and goes out as onSubmit({ requestApproval }).
// It is unticked on every open, a resubmit included (requirments_doc.md §4: "may ask
// for approval again").

export function StickyActionBar({
  autosave,
  checklist,
  isResubmit,
  submitting,
  error,
  onSave,
  onSubmit,
}) {
  const [requestApproval, setRequestApproval] = useState(false);
  const hintId = useId();
  const blocked = !checklist.ok;
  const submitLabel = isResubmit ? "Resubmit" : "Submit";

  // Framed like the buttons beside it, and --acc-l once ticked, so it can't be missed.
  // The hint sits outside the label, so the checkbox's name stays "Ask for approval".
  const approval = (
    <div className="group relative">
      <label
        className={cn(
          "relative inline-flex h-[var(--ctrl-h)] cursor-pointer items-center gap-8 border px-11 text-dense font-medium text-ink select-none max-md:h-[var(--ctrl-h-lg)]",
          "transition-colors duration-[120ms] ease-linear focus-within:border-acc",
          requestApproval
            ? "border-acc bg-acc-l"
            : "border-rule bg-card hover:border-hair2",
        )}
      >
        <input
          type="checkbox"
          checked={requestApproval}
          onChange={(event) => setRequestApproval(event.target.checked)}
          aria-describedby={hintId}
          className="peer focus-halo size-16 shrink-0 cursor-pointer appearance-none border border-rule bg-card checked:border-acc checked:bg-acc"
        />
        <svg
          viewBox="0 0 10 10"
          aria-hidden="true"
          className="pointer-events-none absolute left-[14px] size-[10px] text-on-acc opacity-0 transition-opacity duration-[120ms] peer-checked:opacity-100"
        >
          <path
            d="M1 5.2 4 8l5-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
        Ask for approval
      </label>
      <span
        id={hintId}
        className="pointer-events-none absolute right-0 bottom-[calc(100%+8px)] z-10 hidden w-[300px] border border-hair bg-card px-11 py-8 text-caption text-mut shadow-[var(--shadow-pop)] group-focus-within:block group-hover:block max-md:w-[min(300px,calc(100vw-40px))]"
      >
        A manager will be asked to approve this week. Without it, your report is
        complete once submitted.
      </span>
    </div>
  );

  const submit = (
    <Tooltip content={blocked ? checklist.reason : null}>
      <Button
        aria-disabled={blocked || undefined}
        loading={submitting}
        onClick={() => onSubmit({ requestApproval })}
      >
        {submitLabel}
      </Button>
    </Tooltip>
  );

  return (
    <div className="sticky bottom-0 z-20 mt-52 max-md:-mx-20">
      {error && (
        <p
          role="alert"
          className="border border-b-0 border-st-corr-bd bg-st-corr-bg px-16 py-8 text-dense text-st-corr-fg"
        >
          {error}
        </p>
      )}
      {blocked && (
        <p className="border-t border-hair bg-tint px-20 py-6 text-caption text-mut md:hidden">
          {checklist.reason}
        </p>
      )}
      <div className="flex h-[62px] items-center gap-11 border-t border-hair bg-card px-16 max-md:grid max-md:h-auto max-md:min-h-[88px] max-md:grid-cols-2 max-md:gap-8 max-md:px-20 max-md:py-11">
        <div className="mr-auto">
          <AutosaveIndicator
            state={autosave.state}
            savedAt={autosave.savedAt}
            onRetry={autosave.retry}
          />
        </div>
        <div className="max-md:justify-self-end">{approval}</div>
        <Button variant="secondary" onClick={onSave}>
          Save
        </Button>
        {submit}
      </div>
    </div>
  );
}
