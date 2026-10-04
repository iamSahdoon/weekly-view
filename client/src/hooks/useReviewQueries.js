import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateWeek } from "../lib/invalidateWeek.js";
import { qk } from "../lib/queryKeys.js";
import * as reviewService from "../services/reviewService.js";

// Review hooks (frontend_architecture.md §5.6). C3 holds the comment mutations;
// the desk, approve and send back arrive with C6. Every one waits for the server —
// a lost comment that appears to have worked is worse than a 200 ms wait (§5.7).

// Codes that mean the cached view is now wrong (§5.8): refetch so `canComment`,
// the edit buttons and the thread itself are current.
const STALE_CODES = new Set([
  "COMMENT_NOT_ALLOWED",
  "EDIT_WINDOW_CLOSED",
  "COMMENT_HAS_REPLIES",
  "REPORT_STATE_CHANGED",
  "THREAD_NOT_FOUND",
  "REPORT_NOT_FOUND",
]);

function useCommentMutation(mutationFn, reportId) {
  const queryClient = useQueryClient();
  const refresh = () => {
    invalidateWeek(queryClient, { reportId });
    queryClient.invalidateQueries({ queryKey: qk.all.teamUpdates() });
  };
  return useMutation({
    mutationFn,
    onSuccess: refresh,
    onError: (error) => {
      if (STALE_CODES.has(error.code)) refresh();
    },
  });
}

// C1, C2, C3, C4, C5 — one hook each, as §5.6 lists them. A caller that has a
// target uses `useCommentActions`, which picks between day and week.
export const useCommentOnDay = (reportId) =>
  useCommentMutation(
    ({ weekday, text }) => reviewService.commentOnDay(reportId, weekday, text),
    reportId,
  );

export const useCommentOnWeek = (reportId) =>
  useCommentMutation(
    ({ text }) => reviewService.commentOnWeek(reportId, text),
    reportId,
  );

export const useReply = (reportId) =>
  useCommentMutation(
    ({ threadId, text }) => reviewService.reply(reportId, threadId, text),
    reportId,
  );

export const useEditComment = (reportId) =>
  useCommentMutation(
    ({ threadId, replyId, text }) =>
      replyId
        ? reviewService.editReply(reportId, threadId, replyId, text)
        : reviewService.editComment(reportId, threadId, text),
    reportId,
  );

export const useDeleteComment = (reportId) =>
  useCommentMutation(
    ({ threadId, replyId }) =>
      replyId
        ? reviewService.deleteReply(reportId, threadId, replyId)
        : reviewService.deleteComment(reportId, threadId),
    reportId,
  );

/**
 * What a `CommentThread` fires. `target` is `{ kind: "day", reportId, weekday }` or
 * `{ kind: "week", reportId }`; it picks C1 or C2 for a new thread, and the same
 * reply / edit / delete calls serve both (thread ids are unique within a report).
 */
export function useCommentActions(target) {
  const onDay = useCommentOnDay(target.reportId);
  const onWeek = useCommentOnWeek(target.reportId);
  const replyTo = useReply(target.reportId);
  const edit = useEditComment(target.reportId);
  const remove = useDeleteComment(target.reportId);
  return {
    start: (text) =>
      target.kind === "day"
        ? onDay.mutateAsync({ weekday: target.weekday, text })
        : onWeek.mutateAsync({ text }),
    reply: (threadId, text) => replyTo.mutateAsync({ threadId, text }),
    edit: (threadId, replyId, text) =>
      edit.mutateAsync({ threadId, replyId, text }),
    remove: (threadId, replyId) => remove.mutateAsync({ threadId, replyId }),
    pending: {
      start: target.kind === "day" ? onDay.isPending : onWeek.isPending,
      reply: replyTo.isPending,
      edit: edit.isPending,
      remove: remove.isPending,
    },
  };
}
