import { Button } from "../ui/Button.jsx";
import { formatDate } from "../../lib/format.js";

// The strips and panels that stand where the document would be (design §3.4). All
// pure: the page decides which one the response calls for.

/** "Weekly reports are shared with managers only." — a teammate's view. */
export function TeammateNote() {
  return (
    <div className="bg-tint px-20 py-14 text-dense text-body">
      Weekly reports are shared with managers only.
    </div>
  );
}

/** A manager opens a teammate's Draft: the days render, the document does not. */
export function DraftNote({ authorFirstName }) {
  return (
    <div className="bg-tint px-20 py-20">
      <p className="font-display text-panel-sm font-bold text-ink">
        Weekly report not submitted yet.
      </p>
      <p className="mt-4 text-dense text-body">
        You can read and comment on the daily updates. The rest of the report
        appears here once {authorFirstName} submits it.
      </p>
    </div>
  );
}

/** A manager opens a week in Needs correction: the version they sent back. */
export function CorrectingBanner({ authorFirstName, sentBackAt }) {
  return (
    <div className="bg-tint2 px-20 py-14 text-dense text-body">
      {authorFirstName} is correcting this report.{" "}
      {sentBackAt
        ? `You're seeing the version sent back on ${formatDate(sentBackAt)}.`
        : "You're seeing the version that was sent back."}
    </div>
  );
}

/** A past version chosen in the rail. */
export function RevisionBanner({ revisionNumber, outcome, onBack }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-20 gap-y-6 bg-tint2 px-20 py-11 text-dense text-body">
      <span>
        Viewing rev {revisionNumber} — {outcome}
      </span>
      <Button size="sm" variant="ghost" onClick={onBack}>
        Back to current
      </Button>
    </div>
  );
}
