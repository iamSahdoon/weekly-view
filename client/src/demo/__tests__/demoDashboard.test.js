import { beforeEach, describe, expect, it } from "vitest";
import * as dashboardService from "../../services/dashboardService.js";
import { apiClient } from "../../services/apiClient.js";
import { TASK_TYPES, WEEKDAYS } from "../../lib/constants.js";
import {
  addWeeks,
  currentWeekKey,
  toCalendarDate,
  weekDays,
} from "../../lib/dates.js";
import { createDemoAdapter } from "../demoAdapter.js";
import { createDemoStore } from "../demoStore.js";
import { PERSPECTIVES } from "../fixtures.js";

// The demo answers the dashboard (api_specification.md §2.9 D1–D6, D8) by the server's
// rules: the team is built people-first, `status` filters the team table and nothing
// else, D6 is not week-scoped, hours come from the week's lines at every status, and a
// report that was sent back counts the Done tasks of the sent-back version (I13). The
// cast: Imali's current week is a Draft, last week she was sent back, the week before
// approved; Nadia's last week is Submitted; Sanduni has filed nothing.

let store;
const as = (role) => {
  store.session.userId = PERSPECTIVES[role];
};
const reportOf = (author, weekKey) =>
  store.reports.find(
    (r) => r.author === PERSPECTIVES[author] && r.weekKey === weekKey,
  );
const failure = (promise) =>
  promise.then(
    () => null,
    (error) => error,
  );
const sum = (items) => items.reduce((n, x) => n + x, 0);

const THIS = currentWeekKey();
const LAST = addWeeks(THIS, -1);
const OLDER = addWeeks(THIS, -2);
const names = (rows) => rows.items.map((r) => r.user.name);
const linesOf = (report) => report.days.flatMap((d) => d.lines);

beforeEach(() => {
  store = createDemoStore();
  apiClient.defaults.adapter = createDemoAdapter(store, { latency: 0 });
  as("manager");
});

describe("who may read it", () => {
  it("refuses a member on every block, with FORBIDDEN", async () => {
    as("member");
    const calls = [
      () => dashboardService.getSummary({ weekKey: THIS }),
      () => dashboardService.getTeam({ weekKey: THIS }),
      () => dashboardService.getTrend({ endWeek: THIS }),
      () => dashboardService.getHours({ weekKey: THIS }),
      () => dashboardService.getWorkload({ weekKey: THIS }),
      () => dashboardService.getActivity(),
      () => dashboardService.getProjects({ weekKey: THIS }),
    ];
    for (const call of calls)
      expect((await failure(call())).code).toBe("FORBIDDEN");
  });

  it("refuses a missing or malformed week with 422", async () => {
    expect((await failure(dashboardService.getSummary({}))).code).toBe(
      "VALIDATION_FAILED",
    );
    expect(
      (await failure(dashboardService.getTeam({ weekKey: "2026-W99" })))
        .httpStatus,
    ).toBe(422);
  });
});

describe("D2 · the team table", () => {
  it("has a row for every person on the team, filed or not, sorted by name", async () => {
    const rows = await dashboardService.getTeam({ weekKey: THIS });
    expect(names(rows)).toEqual(["Imali J.", "Nadia F.", "Sanduni B."]);
    expect(rows.meta).toMatchObject({ page: 1, limit: 20, total: 3 });
    const byName = Object.fromEntries(rows.items.map((r) => [r.user.name, r]));
    expect(byName["Imali J."].state).toBe("draft");
    expect(byName["Nadia F."].state).toBe("not_started");
    expect(byName["Nadia F."].report).toBeNull();
    expect(byName["Nadia F."].hours).toBe(0);
  });

  it("carries the five-day strip, the hours as posted and the projects from the lines", async () => {
    const [imali] = (await dashboardService.getTeam({ weekKey: THIS })).items;
    const report = reportOf("member", THIS);
    expect(Object.keys(imali.dayStates)).toEqual(WEEKDAYS);
    expect(imali.postedWeekdays).toEqual(report.days.map((d) => d.weekday));
    expect(imali.hours).toBe(sum(linesOf(report).map((l) => l.hours)));
    expect(imali.projects.length).toBeGreaterThan(0);
    // A Draft shows its hours but not its task figures, which are still private.
    expect(imali.report.tasksDone).toBeNull();
  });

  it("counts Done tasks of the sent-back version for a report that was sent back (I13)", async () => {
    const rows = await dashboardService.getTeam({ weekKey: LAST });
    const imali = rows.items.find((r) => r.user.name === "Imali J.");
    expect(imali.state).toBe("needs_correction");
    const report = reportOf("member", LAST);
    const sentBack = report.revisions.find(
      (v) => v.revisionNumber === report.revisionNumber,
    );
    expect(imali.report.tasksDone).toBe(
      sentBack.content.tasks.filter((t) => t.status === "done").length,
    );
    // The author's live correction is not what a manager's table counts.
    report.content.tasks.forEach((t) => (t.status = "done"));
    const again = await dashboardService.getTeam({ weekKey: LAST });
    expect(
      again.items.find((r) => r.user.name === "Imali J.").report.tasksDone,
    ).toBe(imali.report.tasksDone);
  });

  it("filters by status, sorts, pages, and rejects what the API would", async () => {
    const drafts = await dashboardService.getTeam({
      weekKey: THIS,
      status: "draft",
    });
    expect(names(drafts)).toEqual(["Imali J."]);
    expect(drafts.meta.total).toBe(1);
    const two = await dashboardService.getTeam({
      weekKey: THIS,
      status: "draft,not_started",
    });
    expect(two.meta.total).toBe(3);

    const desc = await dashboardService.getTeam({
      weekKey: THIS,
      sort: "name",
      dir: "desc",
    });
    expect(names(desc)).toEqual(["Sanduni B.", "Nadia F.", "Imali J."]);
    const paged = await dashboardService.getTeam({
      weekKey: THIS,
      limit: 2,
      page: 2,
    });
    expect(names(paged)).toEqual(["Sanduni B."]);
    expect(paged.meta).toMatchObject({
      page: 2,
      limit: 2,
      total: 3,
      totalPages: 2,
    });

    // "Status" sorts by the state's order; "last activity" puts people without a report last.
    const byStatus = await dashboardService.getTeam({
      weekKey: THIS,
      sort: "status",
    });
    expect(byStatus.items.at(-1).state).toBe("draft");
    const byActivity = await dashboardService.getTeam({
      weekKey: LAST,
      sort: "lastActivityAt",
      dir: "desc",
    });
    expect(byActivity.items.at(-1).report).toBeNull();

    expect(
      (
        await failure(
          dashboardService.getTeam({ weekKey: THIS, sort: "hours" }),
        )
      ).code,
    ).toBe("VALIDATION_FAILED");
    expect(
      (
        await failure(
          dashboardService.getTeam({ weekKey: THIS, status: "nope" }),
        )
      ).httpStatus,
    ).toBe(422);
  });

  it("narrows by person and project; a project keeps people with no lines yet only if assigned (I11)", async () => {
    const [imali, nadia] = [PERSPECTIVES.member, PERSPECTIVES.manager];
    expect(
      names(await dashboardService.getTeam({ weekKey: THIS, person: imali })),
    ).toEqual(["Imali J."]);
    expect(
      names(
        await dashboardService.getTeam({
          weekKey: THIS,
          person: `${imali},${nadia}`,
        }),
      ),
    ).toEqual(["Imali J.", "Nadia F."]);

    const clientA = store.projects.find((p) => p.name === "Client A")._id;
    const rnd = store.projects.find((p) => p.name === "R&D")._id;
    // Imali has lines this week, none on R&D: assigned or not, the lines decide. Nadia has
    // no lines at all, so being assigned to R&D is what keeps her in its filter.
    const imaliLines = linesOf(reportOf("member", THIS));
    expect(imaliLines.length).toBeGreaterThan(0);
    expect(
      imaliLines.every(
        (l) => store.tasks.find((t) => t._id === l.taskId).project === clientA,
      ),
    ).toBe(true);
    expect(
      names(
        await dashboardService.getTeam({ weekKey: THIS, project: clientA }),
      ),
    ).toEqual(["Imali J."]);
    expect(
      names(await dashboardService.getTeam({ weekKey: THIS, project: rnd })),
    ).toEqual(["Nadia F."]);
  });

  it("shows a person on leave and leaves them out of the metric's denominator", async () => {
    const imali = store.users.find((u) => u._id === PERSPECTIVES.member);
    imali.leaveFrom = toCalendarDate(weekDays(THIS)[0].date);
    imali.onLeave = true;
    store.reports = store.reports.filter(
      (r) => !(r.author === imali._id && r.weekKey === THIS),
    );
    const rows = await dashboardService.getTeam({ weekKey: THIS });
    expect(rows.items.find((r) => r.user.name === "Imali J.").state).toBe(
      "on_leave",
    );
    const summary = await dashboardService.getSummary({ weekKey: THIS });
    expect(summary.onLeave).toBe(1);
    expect(summary.expected).toBe(2);
  });

  it("is empty for a week before anyone joined", async () => {
    const rows = await dashboardService.getTeam({
      weekKey: addWeeks(THIS, -60),
    });
    expect(rows.items).toEqual([]);
    expect(rows.meta.total).toBe(0);
  });
});

describe("D1 · the metric strip", () => {
  it("agrees with the team table it summarises", async () => {
    for (const weekKey of [THIS, LAST, OLDER]) {
      const [summary, team] = await Promise.all([
        dashboardService.getSummary({ weekKey }),
        dashboardService.getTeam({ weekKey }),
      ]);
      const expected = team.items.filter(
        (r) => !["on_leave", "holiday_week"].includes(r.state),
      );
      const filed = expected.filter((r) =>
        ["submitted", "needs_correction", "approved"].includes(r.state),
      );
      expect(summary).toMatchObject({
        weekKey,
        filed: filed.length,
        expected: expected.length,
        notFiled: expected.length - filed.length,
      });
      expect(summary.compliance).toBe(filed.length / expected.length);
    }
  });

  it("trails over eight weeks and counts what is Needs correction, with the time it was sent back", async () => {
    const summary = await dashboardService.getSummary({ weekKey: LAST });
    expect(summary.complianceTrailing.weeks).toBe(8);
    expect(summary.complianceTrailing.rate).toBeGreaterThan(0);
    expect(summary.needsCorrection.count).toBe(1);
    const report = reportOf("member", LAST);
    const sentBack = report.revisions.find(
      (v) => v.revisionNumber === report.revisionNumber,
    );
    expect(summary.needsCorrection.oldestSentBackAt).toBe(sentBack.reviewedAt);
    expect(
      (await dashboardService.getSummary({ weekKey: THIS })).needsCorrection,
    ).toEqual({
      count: 0,
      oldestSentBackAt: null,
    });
  });

  it("counts open blockers across every status, Drafts included, and the people who raised them", async () => {
    const draft = reportOf("member", THIS);
    const open = draft.days.flatMap((d) => d.blockers).length;
    const summary = await dashboardService.getSummary({ weekKey: THIS });
    expect(summary.openBlockers).toEqual({
      count: open,
      peopleCount: open > 0 ? 1 : 0,
    });
    // Resolving every one takes it to zero.
    for (const blocker of draft.days.flatMap((d) => d.blockers)) {
      draft.blockerResolutions.push({ blockerId: blocker._id });
    }
    expect(
      (await dashboardService.getSummary({ weekKey: THIS })).openBlockers.count,
    ).toBe(0);
  });

  it("is not changed by `status`: the demo ignores it, as the server must", async () => {
    const plain = await dashboardService.getSummary({ weekKey: LAST });
    expect(
      await dashboardService.getSummary({ weekKey: LAST, status: "approved" }),
    ).toEqual(plain);
  });
});

describe("D3 · tasks completed", () => {
  it("has every week of the window, in order, ending at the week asked for", async () => {
    for (const weeks of [4, 8, 12]) {
      const trend = await dashboardService.getTrend({ endWeek: THIS, weeks });
      expect(trend.weeks).toHaveLength(weeks);
      expect(trend.weeks.at(-1)).toBe(THIS);
      expect(trend.team.map((t) => t.weekKey)).toEqual(trend.weeks);
      expect(trend.person).toBeNull();
    }
    expect(
      (await failure(dashboardService.getTrend({ endWeek: THIS, weeks: 5 })))
        .code,
    ).toBe("VALIDATION_FAILED");
  });

  it("counts Done tasks of submitted reports, never a Draft's, and the sent-back version", async () => {
    const trend = await dashboardService.getTrend({ endWeek: THIS, weeks: 4 });
    const byWeek = Object.fromEntries(
      trend.team.map((t) => [t.weekKey, t.tasksDone]),
    );
    expect(byWeek[THIS]).toBe(0); // a Draft: its statuses are the author's alone
    const done = (tasks) => tasks.filter((t) => t.status === "done").length;
    const last = reportOf("member", LAST);
    const nadia = reportOf("manager", LAST);
    expect(byWeek[LAST]).toBe(
      done(
        last.revisions.find((v) => v.revisionNumber === last.revisionNumber)
          .content.tasks,
      ) + done(nadia.content.tasks),
    );
    expect(byWeek[OLDER]).toBe(done(reportOf("member", OLDER).content.tasks));
  });

  it("draws one person's series beside the team's, and narrows the team by `person`", async () => {
    const both = await dashboardService.getTrend({
      endWeek: THIS,
      weeks: 4,
      trendPerson: PERSPECTIVES.manager,
    });
    expect(both.person.map((p) => p.weekKey)).toEqual(both.weeks);
    expect(
      both.person.find((p) => p.weekKey === LAST).tasksDone,
    ).toBeGreaterThan(0);
    const narrowed = await dashboardService.getTrend({
      endWeek: THIS,
      weeks: 4,
      person: PERSPECTIVES.member,
    });
    expect(
      narrowed.team.find((t) => t.weekKey === LAST).tasksDone,
    ).toBeLessThanOrEqual(
      (await dashboardService.getTrend({ endWeek: THIS, weeks: 4 })).team.find(
        (t) => t.weekKey === LAST,
      ).tasksDone,
    );
  });
});

describe("D4, D5 · hours", () => {
  it("D4 has the seven task types in fixed order and totals the week's lines at every status", async () => {
    const data = await dashboardService.getHours({ weekKey: THIS });
    expect(data.items.map((i) => i.type)).toEqual([...TASK_TYPES]);
    const lines = linesOf(reportOf("member", THIS));
    expect(data.total).toBe(sum(lines.map((l) => l.hours)));
    expect(sum(data.items.map((i) => i.hours))).toBe(data.total);
    expect(
      (await dashboardService.getHours({ weekKey: addWeeks(THIS, -60) })).total,
    ).toBe(0);
  });

  it("D5 splits each project's hours by type, busiest first", async () => {
    const data = await dashboardService.getWorkload({ weekKey: LAST });
    expect(data.items.length).toBeGreaterThan(0);
    for (const item of data.items) {
      expect(Object.keys(item.hours)).toEqual([...TASK_TYPES]);
      expect(sum(Object.values(item.hours))).toBe(item.totalHours);
    }
    const totals = data.items.map((i) => i.totalHours);
    expect(totals).toEqual([...totals].sort((a, b) => b - a));
    const lastWeekHours = sum(
      store.reports
        .filter((r) => r.weekKey === LAST)
        .flatMap((r) => linesOf(r).map((l) => l.hours)),
    );
    expect(sum(totals)).toBe(lastWeekHours);
  });

  it("narrows by project (I11)", async () => {
    const clientA = store.projects.find((p) => p.name === "Client A")._id;
    const data = await dashboardService.getWorkload({
      weekKey: LAST,
      project: clientA,
    });
    // The project filter keeps people, not lines: the project is on the chart.
    expect(data.items.map((i) => i.project._id)).toContain(clientA);
    const imaliOnly = await dashboardService.getHours({
      weekKey: LAST,
      person: PERSPECTIVES.member,
    });
    expect(imaliOnly.total).toBe(
      sum(linesOf(reportOf("member", LAST)).map((l) => l.hours)),
    );
  });
});

describe("D6 · recent activity", () => {
  it("is the latest events, newest first, at most eight, whatever the week", async () => {
    const data = await dashboardService.getActivity();
    expect(data.items.length).toBeGreaterThan(0);
    expect(data.items.length).toBeLessThanOrEqual(8);
    const times = data.items.map((e) => e.at);
    expect(times).toEqual([...times].sort().reverse());
    for (const event of data.items) {
      expect(["submitted", "approved", "sent_back"]).toContain(event.type);
      expect(event.actor.name).toBeTruthy();
      expect(event.report).toMatchObject({
        weekKey: expect.any(String),
        status: expect.any(String),
      });
    }
    const verbs = new Set(data.items.map((e) => e.type));
    expect(verbs.has("sent_back")).toBe(true);
  });

  it("never lists more than eight, however many events there are", async () => {
    const report = reportOf("member", OLDER);
    for (let i = 0; i < 10; i++) {
      report.revisions.push({
        ...report.revisions[0],
        revisionNumber: 10 + i,
        submittedAt: new Date(Date.now() - i * 60_000).toISOString(),
        reviewedAt: null,
        action: null,
      });
    }
    expect((await dashboardService.getActivity()).items).toHaveLength(8);
  });
});

describe("D8 · the projects table", () => {
  it("has the active projects that have a plan, with progress and the people who worked on them", async () => {
    const data = await dashboardService.getProjects({ weekKey: THIS });
    expect(data.items.map((i) => i.project.name)).toEqual(["Client A", "R&D"]);
    for (const item of data.items) {
      expect(item.progress.plan).toBeTruthy();
      expect(item.progress).toMatchObject({
        daysUsed: expect.any(Number),
        daysLeft: expect.any(Number),
        overdueDays: expect.any(Number),
        hoursLogged: expect.any(Number),
      });
      const totals = item.people.map((p) => p.hoursTotal);
      expect(totals).toEqual([...totals].sort((a, b) => b - a));
      for (const person of item.people) {
        expect(person.hoursTotal).toBeGreaterThanOrEqual(person.hoursThisWeek);
        expect(person.lastDay).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it("leaves out an inactive project and one with no plan", async () => {
    store.projects.find((p) => p.name === "R&D").status = "inactive";
    store.projects.find((p) => p.name === "Client A").plan = null;
    expect(
      (await dashboardService.getProjects({ weekKey: THIS })).items,
    ).toEqual([]);
  });

  it("reports this week's hours apart from the total", async () => {
    const clientA = (
      await dashboardService.getProjects({ weekKey: THIS })
    ).items.find((i) => i.project.name === "Client A");
    const imali = clientA.people.find((p) => p.user.name === "Imali J.");
    const thisWeekClientA = sum(
      linesOf(reportOf("member", THIS))
        .filter(
          (l) =>
            store.tasks.find((t) => t._id === l.taskId).project ===
            clientA.project._id,
        )
        .map((l) => l.hours),
    );
    expect(imali.hoursThisWeek).toBe(thisWeekClientA);
    expect(imali.hoursTotal).toBeGreaterThan(imali.hoursThisWeek);
  });
});
