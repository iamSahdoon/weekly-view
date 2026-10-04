import { cn } from "../../lib/cn.js";
import { formatDate } from "../../lib/format.js";

// A blocker as it is read (design §3.4, §4.5). The key blocker carries a 2px --acc
// left bar and the word `Key` — colour is never the only signal. A resolved one drops
// from --ink to --body and gains a `Resolved` label with the date in mono; it is never
// struck through. The resolve toggle reuses the §4.5 key-toggle geometry (26×26, 1px
// --rule, a 10×10 outline in --mut) and is present only when `onResolve` is given —
// teammates see the state but no toggle.
//
//   dayLabel   "Tue" in mono, when a list gathers blockers from several days
//   onResolve  (resolved: boolean) => void — saves at once, no confirm

export function BlockerRow({ blocker, dayLabel, onResolve }) {
  const resolved = Boolean(blocker.resolvedAt);
  return (
    <li
      className={cn(
        "relative flex items-start gap-11 py-6 pl-0",
        blocker.isKey &&
          "pl-11 before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-acc",
      )}
    >
      {onResolve && (
        <button
          type="button"
          aria-pressed={resolved}
          aria-label="Mark this blocker as resolved."
          onClick={() => onResolve(!resolved)}
          className="focus-halo group flex size-[26px] shrink-0 items-center justify-center border border-rule bg-transparent transition-colors duration-[120ms] ease-linear hover:border-hair2"
        >
          <span
            className={cn(
              "block size-[10px] border transition-colors duration-[120ms] ease-linear",
              resolved
                ? "border-body bg-body"
                : "border-mut group-hover:border-body",
            )}
          />
        </button>
      )}
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-11 gap-y-2">
        {dayLabel && (
          <span className="font-mono text-micro text-mut">{dayLabel}</span>
        )}
        <span
          className={cn(
            "min-w-0 text-base break-words",
            resolved ? "text-body" : "text-ink",
          )}
        >
          {blocker.text}
        </span>
        {blocker.isKey && (
          <span className="text-micro font-medium text-acc-txt">Key</span>
        )}
        {blocker.carriedOver && (
          <span className="font-mono text-micro text-mut">Carried over</span>
        )}
      </div>
      {resolved && (
        <span className="shrink-0 text-micro text-mut">
          Resolved{" "}
          <span className="font-mono">{formatDate(blocker.resolvedAt)}</span>
        </span>
      )}
    </li>
  );
}
