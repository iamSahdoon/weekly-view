import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

// R10 — flips `resolvedAt` in the week cache at once and restores it on error
// (§5.7: one of the three optimistic toggles). The server keeps the original
// `resolvedAt` when it resolves twice, so the optimistic value is only a stand-in.
export function useResolveBlocker(week) {
  const queryClient = useQueryClient();
  const { user: me } = useAuth();
  const key = qk.week(week.user._id, week.weekKey);
  return useMutation({
    mutationFn: ({ blockerId, resolved }) =>
      resolved
        ? reportService.setResolution(week.report._id, blockerId)
        : reportService.clearResolution(week.report._id, blockerId),
    onMutate: async ({ blockerId, resolved }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      if (previous?.report) {
        queryClient.setQueryData(key, {
          ...previous,
          report: {
            ...previous.report,
            days: previous.report.days.map((day) => ({
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
            })),
          },
        });
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      invalidateWeek(queryClient, {
        userId: week.user._id,
        weekKey: week.weekKey,
        reportId: week.report._id,
      });
      queryClient.invalidateQueries({ queryKey: qk.all.teamUpdates() });
      queryClient.invalidateQueries({ queryKey: qk.all.dashboard() });
    },
  });
}

// R11 — flips `openToTeam` in the week cache at once, restores on error.
export function useTeamComments(week) {
  const queryClient = useQueryClient();
  const key = qk.week(week.user._id, week.weekKey);
  return useMutation({
    mutationFn: ({ weekday, open }) =>
      reportService.setTeamComments(week.report._id, weekday, open),
    onMutate: async ({ weekday, open }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      if (previous?.report) {
        queryClient.setQueryData(key, {
          ...previous,
          report: {
            ...previous.report,
            days: previous.report.days.map((day) =>
              day.weekday === weekday ? { ...day, openToTeam: open } : day,
            ),
          },
        });
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      invalidateWeek(queryClient, {
        userId: week.user._id,
        weekKey: week.weekKey,
        reportId: week.report._id,
      });
      queryClient.invalidateQueries({ queryKey: qk.all.teamUpdates() });
    },
  });
}

// R13 — silent. Invalidates what shows "new" elsewhere, and deliberately **not**
// `week` or `report`: the open page keeps the markers it loaded with, so the person
// can see what is new; they are gone next time (§9.4, FA11).
export function useMarkSeen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reportService.markSeen,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.newMarks() });
      queryClient.invalidateQueries({ queryKey: qk.all.reports() });
      queryClient.invalidateQueries({ queryKey: qk.all.reviewDesk() });
    },
  });
}
