import { useState } from "react";
import { useAuth } from "../../hooks/useAuth.js";
import { useCommentActions } from "../../hooks/useReviewQueries.js";
import { errorCopy } from "../../lib/errorCopy.js";
import { Button } from "../ui/Button.jsx";
import { NewMarker } from "../ui/NewMarker.jsx";
import { Comment } from "./Comment.jsx";
import { CommentComposer } from "./CommentComposer.jsx";

// Design §6.23. A comment on --tint with its replies indented 24px under a hairline,
// oldest first, all shown. `Reply` opens a 2-row composer; `StartThread` below is the
// `Comment` button that opens a new thread. Both exist only for people allowed to
// write there — the parent passes `canReply`. The thread owns the mutations through
// `useCommentActions(target)` (frontend_architecture.md §8.3) and shows each failure
// inline, under the composer or comment it came from (§5.8).
//
//   target      { kind: "day", reportId, weekday } | { kind: "week", reportId }
//   ownerName   the day's author, for the "limited to …" line a refused comment shows

function messageFor(error, target, ownerName) {
  if (error.code === "COMMENT_NOT_ALLOWED" && target.kind === "day") {
    return `Comments on this update are limited to ${ownerName ?? "the author"} and managers.`;
  }
  if (error.code === "REPORT_STATE_CHANGED" && error.details?.status) {
    return `This report changed while you were working — it is now ${error.details.status.replace("_", " ")}.`;
  }
  return errorCopy(error);
}

export function CommentThread({ thread, target, canReply, ownerName }) {
  const { user: me } = useAuth();
  const actions = useCommentActions(target);
  const [replying, setReplying] = useState(false);
  // One failure at a time, keyed by where it should show: "reply", or a comment's id.
  const [failure, setFailure] = useState(null);

  const run =
    (key, action) =>
    async (...args) => {
      setFailure(null);
      try {
        return await action(...args);
      } catch (error) {
        setFailure({ key, message: messageFor(error, target, ownerName) });
        throw error;
      }
    };
  const errorAt = (key) => (failure?.key === key ? failure.message : undefined);

  const hasReplies = thread.replies.length > 0;
  const isWriter = (comment) => comment.author?._id === me._id;

  return (
    <div className="flex flex-col gap-14 bg-tint px-14 py-11">
      <div className="relative">
        {thread.isNew && <NewMarker className="absolute top-[7px] -left-11" />}
        <Comment
          comment={thread}
          isWriter={isWriter(thread)}
          showKind={target.kind === "week"}
          canDelete={!hasReplies && thread.kind !== "send_back"}
          error={errorAt(thread._id)}
          onEdit={run(thread._id, (text) =>
            actions.edit(thread._id, null, text),
          )}
          onDelete={run(thread._id, () => actions.remove(thread._id, null))}
        />
      </div>

      {hasReplies && (
        <div className="ml-24 flex flex-col gap-14 border-l border-hair pl-14">
          {thread.replies.map((item) => (
            <Comment
              key={item._id}
              reply
              comment={item}
              isWriter={isWriter(item)}
              error={errorAt(item._id)}
              onEdit={run(item._id, (text) =>
                actions.edit(thread._id, item._id, text),
              )}
              onDelete={run(item._id, () =>
                actions.remove(thread._id, item._id),
              )}
            />
          ))}
        </div>
      )}

      {canReply &&
        (replying ? (
          <CommentComposer
            label="Reply"
            placeholder="Write a reply"
            submitLabel="Post reply"
            rows={2}
            autoFocus
            pending={actions.pending.reply}
            error={errorAt("reply")}
            onCancel={() => setReplying(false)}
            onSubmit={async (text) => {
              await run("reply", (value) => actions.reply(thread._id, value))(
                text,
              );
              setReplying(false);
            }}
          />
        ) : (
          <div>
            <Button size="sm" variant="ghost" onClick={() => setReplying(true)}>
              Reply
            </Button>
          </div>
        ))}
    </div>
  );
}

/** The `Comment` button: opens a composer for a new thread on `target`. */
export function StartThread({ target, ownerName, label = "Comment" }) {
  const actions = useCommentActions(target);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(undefined);

  if (!open) {
    return (
      <div>
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          {label}
        </Button>
      </div>
    );
  }
  return (
    <CommentComposer
      label="New comment"
      placeholder={
        target.kind === "week" ? "Write an overall comment" : "Write a comment"
      }
      submitLabel="Post comment"
      rows={3}
      autoFocus
      pending={actions.pending.start}
      error={message}
      onCancel={() => {
        setOpen(false);
        setMessage(undefined);
      }}
      onSubmit={async (text) => {
        setMessage(undefined);
        try {
          await actions.start(text);
        } catch (error) {
          setMessage(messageFor(error, target, ownerName));
          throw error;
        }
        setOpen(false);
      }}
    />
  );
}
