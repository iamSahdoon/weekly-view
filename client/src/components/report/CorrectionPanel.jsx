import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDateTime } from "../../lib/format.js";
import { CommentThread } from "../comment/CommentThread.jsx";
import { Button } from "../ui/Button.jsx";

// Shown on This week only while the report is Needs correction (design §3.1):
// --st-corr-bg, 1px --st-corr-bd, a 2px --st-corr-fg left bar. Who sent it back and
// when, the comment, `Open and fix`, and `Reply`, which opens the send-back thread.
// The weekly form shows it above section 01 (`inForm`), without `Open and fix`.

export function CorrectionPanel({ week, inForm = false }) {
  const report = week.report;
  const latest = report.latestComment;
  const [replying, setReplying] = useState(false);
  if (!latest) return null;
  const thread = report.weekComments?.find(
    (t) => t.kind === "send_back" && t.revisionNumber === latest.revisionNumber,
  );

  return (
    <section
      aria-label="Needs correction"
      className="relative flex flex-col gap-11 border border-st-corr-bd bg-st-corr-bg px-24 py-20 before:absolute before:inset-y-[-1px] before:left-[-1px] before:w-2 before:bg-st-corr-fg"
    >
      <p className="text-caption text-mut">
        Sent back by {latest.author?.name ?? "a manager"}{" "}
        <span className="font-mono">
          {formatDateTime(latest.createdAt)} · rev {latest.revisionNumber}
        </span>
      </p>
      <p className="text-lg break-words whitespace-pre-line text-ink">
        {latest.text}
      </p>
      <div className="flex flex-wrap items-center gap-8">
        {!inForm && (
          <Button variant="secondary" asChild>
            <Link to={`/reports/${week.weekKey}/edit`}>Open and fix</Link>
          </Button>
        )}
        {thread && !replying && (
          <Button variant="ghost" onClick={() => setReplying(true)}>
            Reply
          </Button>
        )}
      </div>
      {thread && replying && (
        <CommentThread
          thread={thread}
          target={{ kind: "week", reportId: report._id }}
          canReply
        />
      )}
    </section>
  );
}
