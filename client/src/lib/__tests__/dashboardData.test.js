import { describe, expect, it } from "vitest";
import {
  activityTarget,
  hoursEmptyText,
  hoursRows,
  progressText,
  teamRowHref,
  trendEmptyText,
  trendRows,
  updatesSentence,
  workloadEmptyText,
  workloadRows,
} from "../dashboardData.js";
import { TASK_TYPES } from "../constants.js";
import { xTicks } from "../chartTheme.js";

// What the dashboard blocks do to the API's answers before drawing them.

const zeroHours = () => Object.fromEntries(TASK_TYPES.map((t) => [t, 0]));

describe("the team table's row link", () => {
  const row = (state, id = "u2", report = { _id: "r9" }) => ({
    state,
    user: { _id: id },
    report,
  });
  it("opens a Submitted report that isn't yours for review", () => {
    expect(teamRowHref(row("submitted"), "u1", "2026-W40")).toBe("/review/r9");
  });
  it("opens your own Submitted report at your week, never for review", () => {
    expect(teamRowHref(row("submitted", "u1"), "u1", "2026-W40")).toBe(
      "/reports/2026-W40",
    );
  });
  it("opens everything else as that person's week", () => {
    for (const state of [
      "draft",
      "approved",
      "needs_correction",
      "on_leave",
      "not_started",
    ]) {
      expect(teamRowHref(row(state, "u2", null), "u1", "2026-W40")).toBe(
        "/people/u2/reports/2026-W40",
      );
    }
  });
});

describe("the five-day strip in words", () => {
  it("names the posted and the missing days", () => {
    expect(
      updatesSentence({
        mon: "posted",
        tue: "posted",
        wed: "missing",
        thu: "future",
        fri: "future",
      }),
    ).toBe("Posted Mon, Tue; missing Wed");
  });
  it("says what today, leave and a holiday are", () => {
    expect(
      updatesSentence({
        mon: "posted",
        tue: "today",
        wed: "leave",
        thu: "holiday",
        fri: "future",
      }),
    ).toBe("Posted Mon; not yet today Tue; on leave Wed; holiday Thu");
  });
  it("says so when nothing has been posted", () => {
    expect(
      updatesSentence({
        mon: "future",
        tue: "future",
        wed: "future",
        thu: "future",
        fri: "future",
      }),
    ).toBe("Nothing posted");
  });
});

describe("a project's progress in words", () => {
  const plan = { plannedDays: 20, plannedHours: 160 };
  it("days: used of planned and what is left", () => {
    expect(
      progressText({ plan, daysUsed: 12, daysLeft: 8, overdueDays: 0 }, "days"),
    ).toBe("12 of 20 · 8 left");
  });
  it("days: overdue, singular and plural", () => {
    expect(
      progressText({ plan, daysUsed: 21, daysLeft: 0, overdueDays: 1 }, "days"),
    ).toBe("overdue by 1 day");
    expect(
      progressText({ plan, daysUsed: 23, daysLeft: 0, overdueDays: 3 }, "days"),
    ).toBe("overdue by 3 days");
  });
  it("hours: of planned, or just the hours without a plan", () => {
    expect(progressText({ plan, hoursLogged: 96 }, "hours")).toBe(
      "96 h of 160 h",
    );
    expect(
      progressText(
        { plan: { plannedDays: 20, plannedHours: null }, hoursLogged: 96.5 },
        "hours",
      ),
    ).toBe("96.5 h");
  });
});

describe("the activity feed's target", () => {
  const event = (actor, author) => ({
    actor: { _id: actor, name: "Actor" },
    report: { weekKey: "2026-W40", author: { _id: author, name: "Imali J." } },
  });
  it("says 'week 40' for your own report and the author's name otherwise", () => {
    expect(activityTarget(event("a", "a"))).toBe("week 40");
    expect(activityTarget(event("n", "a"))).toBe("Imali J.’s week 40");
  });
});

describe("the trend's rows", () => {
  const data = {
    weeks: ["2026-W39", "2026-W40"],
    team: [
      { weekKey: "2026-W39", tasksDone: 3 },
      { weekKey: "2026-W40", tasksDone: 5 },
    ],
    person: null,
  };
  it("labels each week W39, W40 and carries the team's count", () => {
    expect(trendRows(data)).toEqual([
      { weekKey: "2026-W39", label: "W39", team: 3 },
      { weekKey: "2026-W40", label: "W40", team: 5 },
    ]);
  });
  it("adds the person's series when one was asked for, and a missing week as zero", () => {
    const rows = trendRows({
      ...data,
      person: [{ weekKey: "2026-W40", tasksDone: 2 }],
    });
    expect(rows.map((r) => r.person)).toEqual([0, 2]);
  });
  it("is empty only when no week has a Done task", () => {
    expect(
      trendEmptyText(
        trendRows({
          ...data,
          team: data.team.map((t) => ({ ...t, tasksDone: 0 })),
        }),
      ),
    ).toBe("No data for W39–W40.");
    expect(trendEmptyText(trendRows(data))).toBeNull();
  });
});

describe("the bar charts' rows", () => {
  it("hours keep the server's seven rows, in order, with the label as a word", () => {
    const data = {
      items: TASK_TYPES.map((type, i) => ({ type, hours: i })),
      total: 21,
    };
    const rows = hoursRows(data);
    expect(rows.map((r) => r.type)).toEqual([...TASK_TYPES]);
    expect(rows[5].label).toBe("Research & study");
    expect(hoursEmptyText(data, "2026-W38")).toBeNull();
    expect(hoursEmptyText({ ...data, total: 0 }, "2026-W38")).toBe(
      "No data for week 38.",
    );
  });

  it("workload flattens each project to its name, its hours by type and its total", () => {
    const data = {
      items: [
        {
          project: { _id: "p1", name: "Client A" },
          hours: { ...zeroHours(), development: 6 },
          totalHours: 6,
        },
      ],
    };
    expect(workloadRows(data)).toEqual([
      {
        id: "p1",
        name: "Client A",
        ...zeroHours(),
        development: 6,
        totalHours: 6,
        end: 0.001,
      },
    ]);
    expect(workloadEmptyText(data, "2026-W38")).toBeNull();
    expect(workloadEmptyText({ items: [] }, "2026-W38")).toBe(
      "No data for week 38.",
    );
    expect(
      workloadEmptyText(
        {
          items: [
            {
              project: { _id: "p1", name: "A" },
              hours: zeroHours(),
              totalHours: 0,
            },
          ],
        },
        "2026-W38",
      ),
    ).toBe("No data for week 38.");
  });
});

describe("x ticks (design §7.3)", () => {
  const weeks = (n) => Array.from({ length: n }, (_, i) => `W${i + 1}`);
  it("shows every tick at eight categories or fewer", () => {
    expect(xTicks(weeks(8))).toEqual(weeks(8));
    expect(xTicks(weeks(4))).toEqual(weeks(4));
  });
  it("shows every other tick above eight, and always the last", () => {
    const ticks = xTicks(weeks(12));
    expect(ticks).toEqual(["W2", "W4", "W6", "W8", "W10", "W12"]);
    expect(xTicks(weeks(9)).at(-1)).toBe("W9");
  });
});
