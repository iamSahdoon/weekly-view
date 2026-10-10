import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { clearWeekMarkers } from "../lib/clearMarkers.js";
import { qk } from "../lib/queryKeys.js";
import * as markerService from "../services/markerService.js";
import { useAuth } from "./useAuth.js";
import { useMarkSeen } from "./useReportQueries.js";
import { useReviewDeskCount } from "./useReviewQueries.js";

// The sidebar's markers (frontend_architecture.md §5.6; design §6.24). N1 carries the
// two dots, V4 the review desk's count. Both refetch on window focus — the two things
// that go stale while the tab is in the background — and neither is ever polled.

/** The keys `navItems.js` may name in `dot` and `count`: what useNavMarks fills. */
export const NAV_MARK_KEYS = ["thisWeek", "myReports", "reviewDesk"];

/** N1 — `{ reviewRequests, nav: { thisWeek, myReports } }`. */
export function useNewMarks() {
  return useQuery({
    queryKey: qk.newMarks(),
    queryFn: markerService.getNewMarks,
    refetchOnWindowFocus: true,
  });
}

/**
 * What the sidebar shows, keyed as `navItems.js` names them: `thisWeek` and `myReports`
 * (dots) and `reviewDesk` (the count). Nothing is marked while a request is pending or
 * has failed: a missing marker is better than a wrong one, and no marker is a toast.
 */
export function useNavMarks() {
  const { user } = useAuth();
  const manager = user?.role === "manager" || user?.role === "admin";
  const marks = useNewMarks();
  const count = useReviewDeskCount({ enabled: manager });
  return {
    thisWeek: Boolean(marks.data?.nav.thisWeek),
    myReports: Boolean(marks.data?.nav.myReports),
    reviewDesk: manager ? (count.data?.count ?? 0) : 0,
  };
}

/**
 * Opening a week (R13): sent once per report per mount, after the week has loaded
 * (frontend_architecture.md §9.4). The open page keeps the markers it loaded with, so the
 * person can see what is new; once they leave it, the cached copies of the week are
 * cleared in place, so reopening it inside the cache's `staleTime` shows none (design
 * §6.24: "Opening the week clears it"). Used by the week page and the review page.
 *
 * The clearing waits a tick: React's StrictMode unmounts and remounts a page at once in
 * development, and that is not leaving it. It also waits for R13 to have landed — a
 * week whose mark failed to save stays marked.
 */
export function useSeenOnOpen(reportId) {
  const queryClient = useQueryClient();
  const { mutate } = useMarkSeen();
  const sentFor = useRef(null);
  const [saved] = useState(() => new Set());
  const [open] = useState(() => new Set());

  useEffect(() => {
    if (sentFor.current === reportId) return;
    sentFor.current = reportId;
    mutate(reportId, { onSuccess: () => saved.add(reportId) });
  }, [reportId, mutate, saved]);

  useEffect(() => {
    open.add(reportId);
    return () => {
      open.delete(reportId);
      setTimeout(() => {
        if (!open.has(reportId) && saved.has(reportId)) {
          clearWeekMarkers(queryClient, reportId);
        }
      }, 0);
    };
  }, [queryClient, reportId, open, saved]);
}
