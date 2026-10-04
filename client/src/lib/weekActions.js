import { WEEKDAY_LABELS } from "./constants.js";
import { weekdayOf } from "./dates.js";

// The top-bar primary action on This week (frontend_architecture.md §9.1, design §3.1),
// derived, never stored. In priority order: Needs correction → Fix and resubmit;
// Submitted or Approved → none; the earliest missing expected day → Fill in {Weekday};
// today expected and not posted → Post today's update; every expected day posted →
// Review and submit. Two navigate to the form, two select a day in the strip.
//
// Returns null, { label, to } or { label, weekday }.

const editPath = (weekKey) => `/reports/${weekKey}/edit`;

export function deriveWeekAction(week, me, today = new Date()) {
  if (!week || week.user._id !== me?._id) return null;
  const status = week.report?.status;
  if (status === "needs_correction") {
    return { label: "Fix and resubmit", to: editPath(week.weekKey) };
  }
  if (status === "submitted" || status === "approved") return null;

  const expected = week.expectedDays ?? [];
  const missing = expected.find((day) => week.dayStates[day] === "missing");
  if (missing) {
    return { label: `Fill in ${WEEKDAY_LABELS[missing]}`, weekday: missing };
  }
  const todayDay = weekdayOf(today);
  if (todayDay && week.dayStates[todayDay] === "today") {
    return { label: "Post today’s update", weekday: todayDay };
  }
  if (
    week.report &&
    expected.length > 0 &&
    expected.every((day) => week.dayStates[day] === "posted")
  ) {
    return { label: "Review and submit", to: editPath(week.weekKey) };
  }
  return null;
}

/**
 * The button in the "This week's report" panel (design §3.1's table): the same name as
 * the top bar where it leads to the form, otherwise the way into the report.
 */
export function derivePanelAction(week) {
  const report = week.report;
  if (!report) return null;
  if (report.status === "needs_correction") {
    return { label: "Open and fix", to: editPath(week.weekKey) };
  }
  if (report.status === "submitted" || report.status === "approved") {
    return { label: "View report", to: `/reports/${week.weekKey}` };
  }
  const allPosted =
    week.expectedDays.length > 0 &&
    week.expectedDays.every((day) => week.dayStates[day] === "posted");
  return allPosted
    ? { label: "Review and submit", to: editPath(week.weekKey) }
    : { label: "Open this week’s report", to: editPath(week.weekKey) };
}
