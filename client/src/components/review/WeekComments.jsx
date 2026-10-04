import { CommentThread, StartThread } from "../comment/CommentThread.jsx";

// The rail's list of overall comments on the week (design §3.4, §6.23): every thread,
// each labelled with its version and, for a send-back or approval, the action it came
// with (the comment shows that itself). `canStart` is the `Comment` button;
// `canReply` opens `Reply` on each thread. The review page (C6) reuses it.

export function WeekComments({ threads, canStart, canReply, reportId }) {
  const target = { kind: "week", reportId };
  return (
    <div className="flex flex-col gap-11">
      {threads.length === 0 && !canStart && (
        <p className="text-dense text-mut">No overall comments yet.</p>
      )}
      {threads.map((thread) => (
        <CommentThread
          key={thread._id}
          thread={thread}
          target={target}
          canReply={canReply}
        />
      ))}
      {canStart && <StartThread target={target} />}
    </div>
  );
}
