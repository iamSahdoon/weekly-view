import { describe, expect, it } from "vitest";
import { deriveWeekAction, derivePanelAction } from "../weekActions.js";

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
