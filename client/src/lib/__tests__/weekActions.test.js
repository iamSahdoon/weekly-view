import { describe, expect, it } from "vitest";
import {
  deriveWeekAction,
  derivePanelAction,
  joinedAfterWeek,
} from "../weekActions.js";

// The top-bar primary action on This week (frontend_architecture.md §9.1): derived from
// the week, in a fixed priority order.

const ME = { _id: "u1" };
// Wednesday 7 October 2026.
const WED = new Date(2026, 9, 7, 10);

const weekOf = (dayStates, report = { status: "draft" }) => ({
  user: { _id: "u1" },
  weekKey: "2026-W41",
  expectedDays: Object.keys(dayStates).filter(
    (d) => !["holiday", "leave", "not_on_team"].includes(dayStates[d]),
  ),
  dayStates,
  report,
});

const states = (mon, tue, wed, thu, fri) => ({ mon, tue, wed, thu, fri });

describe("deriveWeekAction", () => {
  it("Needs correction comes first, even with days missing", () => {
    const week = weekOf(
      states("posted", "missing", "today", "future", "future"),
      { status: "needs_correction" },
    );
    expect(deriveWeekAction(week, ME, WED)).toEqual({
      label: "Fix and resubmit",
      to: "/reports/2026-W41/edit",
    });
  });

  it("Submitted and Approved have no primary action", () => {
    const days = states("posted", "posted", "posted", "posted", "posted");
    for (const status of ["submitted", "approved"]) {
      expect(deriveWeekAction(weekOf(days, { status }), ME, WED)).toBeNull();
    }
  });

  it("the earliest missing day beats today", () => {
    const week = weekOf(
      states("posted", "missing", "today", "future", "future"),
    );
    expect(deriveWeekAction(week, ME, WED)).toEqual({
      label: "Fill in Tuesday",
      weekday: "tue",
    });
  });

  it("today, when it is expected and not posted", () => {
    const week = weekOf(
      states("posted", "posted", "today", "future", "future"),
    );
    expect(deriveWeekAction(week, ME, WED)).toEqual({
      label: "Post today’s update",
      weekday: "wed",
    });
  });

  it("a Not started week offers today too (the report does not exist yet)", () => {
    const week = weekOf(
      states("holiday", "holiday", "today", "future", "future"),
      null,
    );
    expect(deriveWeekAction(week, ME, WED).label).toBe("Post today’s update");
  });

  it("every expected day posted → Review and submit; holidays don't count", () => {
    const week = weekOf(
      states("posted", "holiday", "posted", "posted", "leave"),
    );
    expect(deriveWeekAction(week, ME, WED)).toEqual({
      label: "Review and submit",
      to: "/reports/2026-W41/edit",
    });
  });

  it("today posted with days still ahead: nothing to do yet", () => {
    const week = weekOf(
      states("posted", "posted", "posted", "future", "future"),
    );
    expect(deriveWeekAction(week, ME, WED)).toBeNull();
  });

  it("someone else's week has no action", () => {
    const week = weekOf(
      states("posted", "missing", "today", "future", "future"),
    );
    expect(deriveWeekAction(week, { _id: "u2" }, WED)).toBeNull();
  });
});

describe("derivePanelAction", () => {
  it("names the panel's button after the week's state", () => {
    const open = states("posted", "posted", "today", "future", "future");
    const all = states("posted", "posted", "posted", "posted", "posted");
    expect(derivePanelAction(weekOf(open)).label).toBe(
      "Open this week’s report",
    );
    expect(derivePanelAction(weekOf(all)).label).toBe("Review and submit");
    expect(
      derivePanelAction(weekOf(all, { status: "needs_correction" })).label,
    ).toBe("Open and fix");
    expect(derivePanelAction(weekOf(all, { status: "approved" }))).toEqual({
      label: "View report",
      to: "/reports/2026-W41",
    });
    expect(derivePanelAction(weekOf(open, null))).toBeNull();
  });
});

// Owner decision (auth pages, 2026-10-17): the first-week message for someone who joined
// after the shown week's Friday.
describe("joinedAfterWeek", () => {
  const week = (dayStates) => ({ weekKey: "2026-W42", dayStates });
  const SAT = new Date(2026, 9, 17, 9, 30).toISOString();

  it("joined on the Saturday: the date, and the Monday after", () => {
    const result = joinedAfterWeek(
      week(states(...Array(5).fill("not_on_team"))),
      SAT,
    );
    expect(result.firstWeek).toBe("2026-W43");
    expect(result.firstMonday).toEqual(new Date(2026, 9, 19));
    expect(result.joined).toEqual(new Date(SAT));
  });

  it("a holiday in that week doesn't change it", () => {
    const result = joinedAfterWeek(
      week(
        states(
          "holiday",
          "not_on_team",
          "not_on_team",
          "not_on_team",
          "not_on_team",
        ),
      ),
      SAT,
    );
    expect(result?.firstWeek).toBe("2026-W43");
  });

  it("is null when any day can be posted, or the person joined by Friday", () => {
    expect(
      joinedAfterWeek(
        week(states("not_on_team", "not_on_team", "today", "future", "future")),
        new Date(2026, 9, 14, 9).toISOString(),
      ),
    ).toBeNull();
    expect(
      joinedAfterWeek(
        week(states(...Array(5).fill("not_on_team"))),
        new Date(2026, 9, 16, 9).toISOString(),
      ),
    ).toBeNull();
    expect(
      joinedAfterWeek(week(states(...Array(5).fill("holiday"))), SAT),
    ).toBeNull();
    expect(
      joinedAfterWeek(week(states(...Array(5).fill("not_on_team"))), null),
    ).toBeNull();
  });
});
