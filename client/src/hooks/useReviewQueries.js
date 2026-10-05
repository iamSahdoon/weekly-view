import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { invalidateWeek } from "../lib/invalidateWeek.js";
import { qk } from "../lib/queryKeys.js";
import { firstOther, nextInQueueParams } from "../lib/reviewDeskParams.js";
import * as reviewService from "../services/reviewService.js";

// Review hooks (frontend_architecture.md §5.6). C3 holds the comment mutations, C6 the
// desk, approve and send back. Every one waits for the server — a lost comment that
// appears to have worked is worse than a 200 ms wait (§5.7). The desk's count (V4)
// arrives with the sidebar's marker in C9.

/** V3 — the review desk; `filters` are already API params. */
export function useReviewDesk(filters) {
  return useQuery({
    queryKey: qk.reviewDesk(filters),
    queryFn: () => reviewService.listReviewDesk(filters),
    placeholderData: keepPreviousData,
  });
}

// V1 and V2 — the response is the reviewed report; it goes straight into the report
// cache so the page can show the outcome without another request, and every view that
// lists, counts or reviews reports is marked stale (§5.7). `REPORT_STATE_CHANGED` and
// `SELF_REVIEW_FORBIDDEN` mean the cached report is wrong, so it is refetched; the
// panel words the failure itself.
function useReviewMutation(mutationFn) {
  const queryClient = useQueryClient();
  const refetchReport = (id) =>
    queryClient.invalidateQueries({ queryKey: qk.report(id) });
  return useMutation({
    mutationFn,
    onSuccess: (view) => {
      queryClient.setQueryData(qk.report(view.report._id), view);
      // Also reaches the report's versions, which now carry the reviewer and time.
      for (const key of [
        qk.report(view.report._id),
        qk.all.week(),
        qk.all.reports(),
        qk.all.reviewDesk(),
        qk.newMarks(),
        qk.all.dashboard(),
      ]) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
    onError: (error, vars) => {
      if (
        ["REPORT_STATE_CHANGED", "SELF_REVIEW_FORBIDDEN"].includes(error.code)
      ) {
        refetchReport(vars.reportId);
      }
    },
  });
}

/** V1 — `{ reportId, revisionNumber, comment? }`. */
export const useApprove = () =>
  useReviewMutation(({ reportId, ...body }) =>
    reviewService.approve(reportId, body),
  );

/** V2 — `{ reportId, revisionNumber, comment }`. */
export const useSendBack = () =>
  useReviewMutation(({ reportId, ...body }) =>
    reviewService.sendBack(reportId, body),
  );

/**
 * "Next in review desk" (§9.7): the first report on the desk, oldest first and with the
 * filters of the desk the reviewer came from (`deskSearch`), that isn't `currentId`.
 * `{ to, state }` for a `Link`: the review page when there is one, else the desk, whose
 * empty state says so. Asked only once the reviewer has acted (`enabled`); the desk
 * invalidation that action causes keeps the answer current.
 */
export function useNextInQueue(currentId, { deskSearch, enabled = true } = {}) {
  const params = nextInQueueParams(deskSearch);
  const query = useQuery({
    queryKey: qk.reviewDesk(params),
    queryFn: () => reviewService.listReviewDesk(params),
    enabled,
  });
  const next = query.data ? firstOther(query.data.items, currentId) : null;
  return {
    isPending: enabled && query.isPending,
    to: next ? `/review/${next._id}` : "/review",
    state: next ? { deskSearch: deskSearch ?? "" } : undefined,
    hasNext: Boolean(next),
  };
}

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
