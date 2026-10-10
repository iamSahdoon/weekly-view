import { qk } from "./queryKeys.js";

// "Opening a week clears it" (design §6.24). The server stops reporting a week as new the
// moment R13 lands, but a page reopened inside the 30 s `staleTime` is served from the cache
// first, with the markers it loaded with (frontend_architecture.md §9.4, FA11). So once the
// person has left the week, the copies of it still in the cache are cleared in place: no
// request, and nothing for a moment's flash. Pure functions below; `clearReportMarkers`
// applies them to a QueryClient.

const clearThread = (thread) =>
  thread.isNew ? { ...thread, isNew: false } : thread;

const clearThreads = (threads) => {
  if (!Array.isArray(threads) || !threads.some((t) => t.isNew)) return threads;
  return threads.map(clearThread);
};

/** A WeekView (R3, R4, U8) of `reportId` with no thread marked new; any other value as it was. */
export function clearedWeekView(view, reportId) {
  const report = view?.report;
  if (!report || report._id !== reportId) return view;
  const days = report.days.map((day) => {
    const comments = clearThreads(day.comments);
    return comments === day.comments ? day : { ...day, comments };
  });
  const weekComments = clearThreads(report.weekComments);
  const unchanged =
    weekComments === report.weekComments &&
    days.every((day, i) => day === report.days[i]);
  return unchanged
    ? view
    : { ...view, report: { ...report, days, weekComments } };
}

/** A paginated list (R1, U7, V3) with `reportId`'s row no longer new. */
export function clearedRows(data, reportId) {
  if (!Array.isArray(data?.items)) return data;
  if (!data.items.some((row) => row._id === reportId && row.isNew)) return data;
  return {
    ...data,
    items: data.items.map((row) =>
      row._id === reportId ? { ...row, isNew: false } : row,
    ),
  };
}

/** The team updates feed (R12) with `reportId`'s day no longer carrying a new thread. */
export function clearedFeed(data, reportId) {
  if (!Array.isArray(data?.items)) return data;
  const touched = data.items.some(
    (entry) =>
      entry.reportId === reportId && entry.day?.comments?.some((t) => t.isNew),
  );
  if (!touched) return data;
  return {
    ...data,
    items: data.items.map((entry) =>
      entry.reportId === reportId && entry.day
        ? {
            ...entry,
            day: { ...entry.day, comments: clearThreads(entry.day.comments) },
          }
        : entry,
    ),
  };
}

/** Lists and the feed: safe to clear the moment R13 lands, since the open page shows none of them. */
export function clearListMarkers(queryClient, reportId) {
  for (const key of [qk.all.reports(), qk.all.reviewDesk()]) {
    queryClient.setQueriesData({ queryKey: key }, (data) =>
      clearedRows(data, reportId),
    );
  }
  queryClient.setQueriesData({ queryKey: qk.all.teamUpdates() }, (data) =>
    clearedFeed(data, reportId),
  );
}

/** The cached copies of the week itself: cleared only once its page has been left. */
export function clearWeekMarkers(queryClient, reportId) {
  for (const key of [qk.all.week(), qk.all.report()]) {
    queryClient.setQueriesData({ queryKey: key }, (data) =>
      clearedWeekView(data, reportId),
    );
  }
}
