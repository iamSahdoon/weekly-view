import { qk } from "./queryKeys.js";

// The one invalidation helper for a week (frontend_architecture.md §5.7): the week
// the mutation acted on and its report, which also reaches the report's revisions.
// A caller that doesn't hold the week's coordinates (a comment thread knows only
// its report) leaves out `userId` / `weekKey` and every cached week is marked stale
// — only the weeks on screen refetch.

export function invalidateWeek(queryClient, { userId, weekKey, reportId }) {
  queryClient.invalidateQueries({
    queryKey: userId && weekKey ? qk.week(userId, weekKey) : qk.all.week(),
  });
  if (reportId) {
    queryClient.invalidateQueries({ queryKey: qk.report(reportId) });
  }
}
