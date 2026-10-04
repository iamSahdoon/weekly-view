import { cn } from "../../lib/cn.js";
import { formatDate, revisionOutcome } from "../../lib/format.js";

// The versions list in the right rail (design §3.4): `rev 3 current`, `rev 2 sent
// back`. Selecting a past version swaps the document (the page holds the choice);
// selecting the current one is the same as going back to it. `selected` is a
// revision number, or null for the current document.

export function RevisionsRail({ revisions, selected, onSelect }) {
  if (revisions.length === 0) {
    return <p className="text-dense text-mut">Nothing submitted yet.</p>;
  }
  return (
    <ul className="flex flex-col">
      {revisions.map((revision) => {
        const active =
          selected === revision.revisionNumber ||
          (selected == null && revision.isCurrent);
        return (
          <li key={revision.revisionNumber}>
            <button
              type="button"
              aria-current={active ? "true" : undefined}
              onClick={() =>
                onSelect(revision.isCurrent ? null : revision.revisionNumber)
              }
              className={cn(
                "focus-inset flex w-full items-baseline gap-8 px-8 py-6 text-left text-dense transition-colors duration-[120ms] ease-linear hover:bg-tint",
                active && "bg-tint2 text-ink",
              )}
            >
              <span className="font-mono text-micro text-ink">
                rev {revision.revisionNumber}
              </span>
              <span className="flex-1 text-body">
                {revision.isCurrent ? "current" : revisionOutcome(revision)}
              </span>
              <span className="font-mono text-micro text-mut">
                {formatDate(revision.submittedAt)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
