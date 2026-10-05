import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useApprove,
  useCommentOnWeek,
  useNextInQueue,
  useSendBack,
} from "../../hooks/useReviewQueries.js";
import { errorCopy } from "../../lib/errorCopy.js";
import { firstNameOf } from "../../lib/format.js";
import { qk } from "../../lib/queryKeys.js";
import { outcomeLine } from "../../lib/reviewOutcome.js";
import { Button } from "../ui/Button.jsx";
import { ConfirmDialog } from "../ui/ConfirmDialog.jsx";
import { Textarea } from "../ui/Textarea.jsx";

// The review page's action panel (design §3.6, frontend_architecture.md §9.7): one
// textarea, three actions. `Approve` takes an optional comment, `Send back` needs one of
// at least 10 characters and asks first, `Comment only` adds a thread and leaves the
// panel where it is. Not shown for your own report — the page leaves it out of the tree.
//
// The version the reviewer read is pinned: `readRevision` is set on the first render and
// moves only when the person chooses `Reload`. Both decisions send it. If the report now
// shows a later version — or a decision is refused with REPORT_STATE_CHANGED — a banner
// says so, both decisions are disabled, and the textarea keeps what was typed.
//
//   report        the WeekView's report (R4)
//   revisions     R8's items (for who reviewed it), or undefined while loading
//   deskSearch    the desk's address, so "Next in review desk" keeps its filters

const MIN_SEND_BACK = 10;
const PLACEHOLDER =
  "Add a comment on the week, or say what needs to change if you’re sending it back.";

const currentRevision = (revisions) =>
  revisions?.find((r) => r.isCurrent) ?? null;

export function ReviewActionPanel({ report, revisions, deskSearch }) {
  // What this person did here, so the panel can say so and offer the next report. A
  // report that was already reviewed when the page opened never sets it.
  const [acted, setActed] = useState(null);
  const next = useNextInQueue(report._id, {
    deskSearch,
    enabled: acted !== null,
  });

  if (report.status === "submitted" && acted === null) {
    return <ReviewForm report={report} onDone={setActed} />;
  }

  const line =
    outcomeLine(report, currentRevision(revisions)) ??
    "This report hasn’t been submitted, so there is nothing to review yet.";
  return (
    <div
      className={
        acted === null
          ? "flex flex-col gap-11 bg-tint2 px-14 py-14"
          : "flex flex-col gap-14 border-t border-hair bg-tint px-14 py-14"
      }
    >
      <p className="text-base text-ink">{line}</p>
      {acted !== null &&
        (next.isPending ? (
          <Button variant="secondary" size="sm" disabled className="self-start">
            Next in review desk
          </Button>
        ) : (
          <Button variant="secondary" size="sm" asChild className="self-start">
            <Link to={next.to} state={next.state}>
              Next in review desk
              <ChevronRight aria-hidden="true" />
            </Link>
          </Button>
        ))}
    </div>
  );
}

function ReviewForm({ report, onDone }) {
  const queryClient = useQueryClient();
  const [readRevision, setReadRevision] = useState(report.revisionNumber);
  const [text, setText] = useState("");
  const [stale, setStale] = useState(false);
  const [failure, setFailure] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const approve = useApprove();
  const sendBack = useSendBack();
  const comment = useCommentOnWeek(report._id);

  const trimmed = text.trim();
  const busy = approve.isPending || sendBack.isPending || comment.isPending;
  const behind = stale || report.revisionNumber !== readRevision;
  const author = report.author?.name ?? "The author";
  const week = Number(report.weekKey.slice(6));

  const run = async (action) => {
    setFailure(null);
    try {
      return await action();
    } catch (error) {
      if (error.code === "REPORT_STATE_CHANGED") setStale(true);
      setFailure(
        error.code === "VALIDATION_FAILED" && error.fields?.comment
          ? error.fields.comment
          : error.code === "REPORT_STATE_CHANGED" && error.details?.status
            ? `This report changed while you were working — it is now ${error.details.status.replace("_", " ")}.`
            : errorCopy(error),
      );
      return undefined;
    }
  };

  const doApprove = async () => {
    const view = await run(() =>
      approve.mutateAsync({
        reportId: report._id,
        revisionNumber: readRevision,
        comment: trimmed || undefined,
      }),
    );
    if (view) onDone("approved");
  };

  const doSendBack = async () => {
    const view = await run(() =>
      sendBack.mutateAsync({
        reportId: report._id,
        revisionNumber: readRevision,
        comment: trimmed,
      }),
    );
    // A refusal closes the dialog too, so the reason shows above the buttons.
    setConfirming(false);
    if (view) onDone("changes_requested");
  };

  const doComment = async () => {
    const done = await run(() => comment.mutateAsync({ text: trimmed }));
    if (done) setText("");
  };

  const reload = () => {
    setReadRevision(report.revisionNumber);
    setStale(false);
    setFailure(null);
    queryClient.invalidateQueries({ queryKey: qk.report(report._id) });
  };

  return (
    <section
      aria-label="Review"
      className="flex flex-col gap-11 border-t border-hair bg-tint px-14 py-14"
    >
      {behind && (
        <div className="flex flex-col items-start gap-8 bg-tint2 px-11 py-11 text-dense text-body">
          <p>
            {firstNameOf(author)} submitted a new version. Reload to review it.
          </p>
          <Button size="sm" variant="secondary" onClick={reload}>
            Reload
          </Button>
        </div>
      )}
      <label
        id="review-comment"
        htmlFor="review-comment-text"
        className="text-caption font-medium text-mut"
      >
        Overall comment
      </label>
      <Textarea
        id="review-comment-text"
        rows={4}
        maxLength={2000}
        placeholder={PLACEHOLDER}
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="[&_textarea]:min-h-0"
      />
      {failure && (
        <p role="alert" className="text-dense text-st-corr-fg">
          {failure}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-8">
        <Button
          loading={approve.isPending}
          disabled={behind || busy}
          onClick={doApprove}
        >
          Approve
        </Button>
        <Button
          variant="secondary"
          disabled={behind || busy || trimmed.length < MIN_SEND_BACK}
          title={
            trimmed.length < MIN_SEND_BACK
              ? `Say what needs to change — at least ${MIN_SEND_BACK} characters.`
              : undefined
          }
          onClick={() => setConfirming(true)}
        >
          Send back
        </Button>
        <Button
          variant="ghost"
          loading={comment.isPending}
          disabled={busy || trimmed.length === 0}
          onClick={doComment}
        >
          Comment only
        </Button>
      </div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Send week ${week} back to ${author}?`}
        confirmLabel="Send back"
        destructive={false}
        pending={sendBack.isPending}
        onConfirm={doSendBack}
      >
        <p>{firstNameOf(author)} will see this comment:</p>
        <blockquote className="mt-8 border-l-2 border-hair2 pl-11 break-words whitespace-pre-wrap text-body">
          {trimmed}
        </blockquote>
      </ConfirmDialog>
    </section>
  );
}
