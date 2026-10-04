import { useState } from "react";
import { cn } from "../../lib/cn.js";
import { formatDateTime, minutesLeft } from "../../lib/format.js";
import { useNow } from "../../hooks/useNow.js";
import { Avatar } from "../ui/Avatar.jsx";
import { ConfirmDialog } from "../ui/ConfirmDialog.jsx";
import { RoleChip } from "../ui/RoleChip.jsx";
import { CommentComposer } from "./CommentComposer.jsx";

// Design §6.23. A comment or a reply: avatar 22px, name, role chip for managers and
// admins, time in mono, and on a week comment its version and kind. For its writer it
// shows Edit and Delete with a mono countdown for ten minutes after posting; the
// buttons then disappear, silently. Delete is absent on a comment with replies and on
// a send-back (`canDelete`). The server enforces the window; a client clock that
// disagrees is corrected by EDIT_WINDOW_CLOSED and a refetch.
//
//   reply     the smaller, indented form (13px)
//   onEdit    async (text) — rejects on failure; the composer keeps the text
//   onDelete  async ()     — rejects on failure

const KIND_LABELS = {
  comment: null,
  approval: "approved",
  send_back: "sent back",
};

function kindLine(comment) {
  if (comment.revisionNumber == null) return null;
  const kind = KIND_LABELS[comment.kind];
  return kind
    ? `rev ${comment.revisionNumber} · ${kind}`
    : `rev ${comment.revisionNumber}`;
}

export function Comment({
  comment,
  isWriter,
  showKind = false,
  reply = false,
  canDelete = true,
  onEdit,
  onDelete,
  error,
}) {
  const now = useNow();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  const left = minutesLeft(comment.editableUntil, now);
  const writable = isWriter && left > 0;
  const kind = showKind ? kindLine(comment) : null;

  const remove = async () => {
    setPending(true);
    try {
      await onDelete();
      setConfirming(false);
    } catch {
      setConfirming(false); // the owner shows the reason under the comment
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", reply && "text-dense")}>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
        <Avatar name={comment.author?.name ?? ""} size={22} />
        <span className="text-dense font-medium text-ink">
          {comment.author?.name ?? "Someone"}
        </span>
        <RoleChip role={comment.author?.role} />
        <span className="font-mono text-micro text-mut">
          {formatDateTime(comment.createdAt)}
          {comment.editedAt && " · edited"}
        </span>
        {kind && <span className="font-mono text-micro text-mut">{kind}</span>}
      </div>

      {editing ? (
        <CommentComposer
          label="Edit comment"
          submitLabel="Save"
          initialValue={comment.text}
          rows={reply ? 2 : 3}
          error={error}
          autoFocus
          onCancel={() => setEditing(false)}
          onSubmit={async (text) => {
            await onEdit(text);
            setEditing(false);
          }}
        />
      ) : (
        <p
          className={cn(
            "break-words whitespace-pre-wrap text-body",
            reply ? "text-dense" : "text-base",
          )}
        >
          {comment.text}
        </p>
      )}

      {!editing && error && (
        <p role="alert" className="text-dense text-st-corr-fg">
          {error}
        </p>
      )}

      {writable && !editing && (
        <div className="flex items-center gap-14 text-dense">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="focus-halo text-body underline-offset-2 hover:text-ink hover:underline"
          >
            Edit
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="focus-halo text-body underline-offset-2 hover:text-ink hover:underline"
            >
              Delete
            </button>
          )}
          <span className="font-mono text-micro text-mut">{left} min left</span>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Delete this comment?"
        confirmLabel="Delete comment"
        pending={pending}
        onConfirm={remove}
      >
        It is removed for everyone who can read this thread.
      </ConfirmDialog>
    </div>
  );
}
