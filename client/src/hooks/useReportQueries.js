import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { clearListMarkers } from "../lib/clearMarkers.js";
import { toastError } from "../lib/errorToast.js";
import { invalidateWeek } from "../lib/invalidateWeek.js";
import { qk } from "../lib/queryKeys.js";
import * as reportService from "../services/reportService.js";
import * as userService from "../services/userService.js";
import { useAuth } from "./useAuth.js";

// Report hooks (frontend_architecture.md §5.6): key + service + options. Hooks are
// thin; the decision of what to render lives in the page.

/**
 * A week for anyone. Your own is R3, anyone else's U8 — both return a WeekView and
 * share `qk.week`, so callers never choose the endpoint.
 */
export function useWeek(userId, weekKey) {
  const { user: me } = useAuth();
  const isMe = userId === me?._id;
  return useQuery({
    queryKey: qk.week(userId, weekKey),
    queryFn: () =>
      isMe
        ? reportService.getMyWeek(weekKey)
        : userService.getUserWeek(userId, weekKey),
  });
}

/** R1 — the caller's own reports; `filters` are already API params. */
export function useMyReports(filters) {
  return useQuery({
    queryKey: qk.reports(filters),
    queryFn: () => reportService.listMyReports(filters),
    placeholderData: keepPreviousData,
  });
}

/** U7 — someone's history: every week they were on the team. Managers and admins. */
export function useUserReports(userId, filters) {
  return useQuery({
    queryKey: qk.reportsOf(userId, filters),
    queryFn: () => userService.listUserReports(userId, filters),
    placeholderData: keepPreviousData,
  });
}

/** R2 — the personal strip. */
export function useReportSummary(weekKey, month) {
  return useQuery({
    queryKey: qk.summary(weekKey, month),
    queryFn: () => reportService.getSummary({ weekKey, month }),
  });
}

/**
 * R12 — one day of the team. `filters` are `{ project?, blockersOnly? }`; empty ones are
 * left out so two equal views share a cache entry. Sorting is the server's (§9.2).
 */
export function useTeamUpdates(weekKey, weekday, filters = {}) {
  const params = {};
  if (filters.project) params.project = filters.project;
  if (filters.blockersOnly) params.blockersOnly = true;
  return useQuery({
    queryKey: qk.teamUpdates(weekKey, weekday, params),
    queryFn: () =>
      reportService.listTeamUpdates({ weekKey, weekday, ...params }),
    placeholderData: keepPreviousData,
  });
}

/** R4 — a week by its report's id (the review page, C6). */
export function useReport(id) {
  return useQuery({
    queryKey: qk.report(id),
    queryFn: () => reportService.getReport(id),
    enabled: Boolean(id),
  });
}

/** R8. `enabled` carries the condition (the page passes whether content is readable). */
export function useRevisions(id, { enabled = true } = {}) {
  return useQuery({
    queryKey: qk.revisions(id),
    queryFn: () => reportService.listRevisions(id),
    enabled: Boolean(id) && enabled,
  });
}

/** R9. Disabled until a version is chosen. */
export function useRevision(id, revisionNumber) {
  return useQuery({
    queryKey: qk.revision(id, revisionNumber),
    queryFn: () => reportService.getRevision(id, revisionNumber),
    enabled: Boolean(id) && revisionNumber != null,
  });
}

// R5 — post or edit a day. Not optimistic: a half-posted day that appears to have
// worked is worse than a short wait (§5.7). The response is the author's WeekView,
// written straight into the week cache; the views the day feeds are marked stale.
export function usePutDay() {
  const queryClient = useQueryClient();
  const { user: me } = useAuth();
  return useMutation({
    mutationFn: ({ weekKey, weekday, body }) =>
      reportService.putDay(weekKey, weekday, body),
    onSuccess: (view, { weekKey }) => {
      queryClient.setQueryData(qk.week(me._id, weekKey), view);
      queryClient.invalidateQueries({ queryKey: qk.report(view.report._id) });
      for (const key of [
        qk.all.teamUpdates(),
        qk.all.dashboard(),
        qk.all.reports(),
        qk.all.projects(),
        qk.all.tasks(),
      ]) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

// R6 — the autosave. Quiet: the response goes into the week cache and nothing else is
// touched (§5.7). The form is never reset from it (§6.2).
export function useSaveContent() {
  const queryClient = useQueryClient();
  const { user: me } = useAuth();
  return useMutation({
    mutationFn: ({ reportId, body }) =>
      reportService.saveContent(reportId, body),
    onSuccess: (view) => {
      queryClient.setQueryData(qk.week(me._id, view.weekKey), view);
    },
  });
}

// R7 — submit or resubmit. Not optimistic; the response replaces the week, and every
// view that lists, counts or reviews reports is marked stale.
export function useSubmitReport() {
  const queryClient = useQueryClient();
  const { user: me } = useAuth();
  return useMutation({
    mutationFn: ({ reportId, requestApproval }) =>
      reportService.submitReport(reportId, { requestApproval }),
    onSuccess: (view) => {
      queryClient.setQueryData(qk.week(me._id, view.weekKey), view);
      queryClient.invalidateQueries({ queryKey: qk.report(view.report._id) });
      for (const key of [
        qk.all.reports(),
        qk.all.reviewDesk(),
        qk.all.dashboard(),
        qk.newMarks(),
        qk.all.tasks(),
      ]) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

// The two optimistic toggles of §5.7 — the only optimistic writes in the product. Each
// flips its field in the week cache at once; on failure it restores the cache and raises
// an error toast with `Retry`, which sends the same write again. Built as options so
// the rules can be tested without rendering a hook; `retry(vars)` re-fires the mutation.

function editWeek(queryClient, key, edit) {
  const previous = queryClient.getQueryData(key);
  if (previous?.report) {
    queryClient.setQueryData(key, {
      ...previous,
      report: { ...previous.report, days: edit(previous.report.days) },
    });
  }
  return previous;
}

// The team updates feed shows the same days (`{ items: [{ reportId, day }] }`), so a
// toggle made there flips at once too: the entries of this report are edited in every
// cached feed, and the snapshots restore them if the server refuses.
function editFeeds(queryClient, week, editDay) {
  const snapshots = queryClient.getQueriesData({
    queryKey: qk.all.teamUpdates(),
  });
  queryClient.setQueriesData({ queryKey: qk.all.teamUpdates() }, (data) =>
    data?.items
      ? {
          ...data,
          items: data.items.map((item) =>
            item.reportId === week.report._id && item.day
              ? { ...item, day: editDay(item.day) }
              : item,
          ),
        }
      : data,
  );
  return snapshots;
}

const restoreFeeds = (queryClient, snapshots) => {
  for (const [key, data] of snapshots ?? [])
    queryClient.setQueryData(key, data);
};

const refreshWeek = (queryClient, week) => {
  invalidateWeek(queryClient, {
    userId: week.user._id,
    weekKey: week.weekKey,
    reportId: week.report._id,
  });
  queryClient.invalidateQueries({ queryKey: qk.all.teamUpdates() });
};

// R10 — `resolvedAt` flips at once. The server keeps the original `resolvedAt` when it
// resolves twice, so the optimistic value is only a stand-in until the refetch.
export function resolveBlockerOptions({ queryClient, week, me, retry }) {
  const key = qk.week(week.user._id, week.weekKey);
  return {
    mutationFn: ({ blockerId, resolved }) =>
      resolved
        ? reportService.setResolution(week.report._id, blockerId)
        : reportService.clearResolution(week.report._id, blockerId),
    onMutate: async ({ blockerId, resolved }) => {
      await queryClient.cancelQueries({ queryKey: key });
      await queryClient.cancelQueries({ queryKey: qk.all.teamUpdates() });
      const flip = (day) => ({
        ...day,
        blockers: day.blockers.map((b) =>
          b._id === blockerId
            ? {
                ...b,
                resolvedAt: resolved ? new Date().toISOString() : null,
                resolvedBy: resolved ? me : null,
              }
            : b,
        ),
      });
      const previous = editWeek(queryClient, key, (days) => days.map(flip));
      const feeds = editFeeds(queryClient, week, flip);
      return { previous, feeds };
    },
    onError: (error, vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      restoreFeeds(queryClient, context?.feeds);
      toastError(
        vars.resolved
          ? "That blocker wasn’t marked as resolved."
          : "That blocker wasn’t reopened.",
        error,
        { id: `blocker-${vars.blockerId}`, retry: () => retry(vars) },
      );
    },
    onSettled: () => {
      refreshWeek(queryClient, week);
      queryClient.invalidateQueries({ queryKey: qk.all.dashboard() });
    },
  };
}

export function useResolveBlocker(week) {
  const queryClient = useQueryClient();
  const { user: me } = useAuth();
  const mutation = useMutation(
    resolveBlockerOptions({
      queryClient,
      week,
      me,
      retry: (vars) => mutation.mutate(vars),
    }),
  );
  return mutation;
}

// R11 — `openToTeam` flips at once.
export function teamCommentsOptions({ queryClient, week, retry }) {
  const key = qk.week(week.user._id, week.weekKey);
  return {
    mutationFn: ({ weekday, open }) =>
      reportService.setTeamComments(week.report._id, weekday, open),
    onMutate: async ({ weekday, open }) => {
      await queryClient.cancelQueries({ queryKey: key });
      await queryClient.cancelQueries({ queryKey: qk.all.teamUpdates() });
      const flip = (day) =>
        day.weekday === weekday ? { ...day, openToTeam: open } : day;
      const previous = editWeek(queryClient, key, (days) => days.map(flip));
      const feeds = editFeeds(queryClient, week, flip);
      return { previous, feeds };
    },
    onError: (error, vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      restoreFeeds(queryClient, context?.feeds);
      toastError("That day’s comment setting didn’t save.", error, {
        id: `team-comments-${vars.weekday}`,
        retry: () => retry(vars),
      });
    },
    onSettled: () => refreshWeek(queryClient, week),
  };
}

export function useTeamComments(week) {
  const queryClient = useQueryClient();
  const mutation = useMutation(
    teamCommentsOptions({
      queryClient,
      week,
      retry: (vars) => mutation.mutate(vars),
    }),
  );
  return mutation;
}

// R13 — silent. Invalidates what shows "new" elsewhere, and deliberately **not**
// `week` or `report`: the open page keeps the markers it loaded with, so the person
// can see what is new; they are gone next time (§9.4, FA11). The lists and the team feed
// are cleared in place as well, so none of them shows the marker again for a moment while
// it refetches; the cached week is cleared when its page is left (useSeenOnOpen).
export function useMarkSeen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reportService.markSeen,
    onSuccess: (_, reportId) => {
      clearListMarkers(queryClient, reportId);
      queryClient.invalidateQueries({ queryKey: qk.newMarks() });
      queryClient.invalidateQueries({ queryKey: qk.all.reports() });
      queryClient.invalidateQueries({ queryKey: qk.all.reviewDesk() });
    },
  });
}
