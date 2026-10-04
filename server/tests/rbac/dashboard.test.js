import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Holiday } from "../../src/models/holidayModel.js";
import { Project } from "../../src/models/projectModel.js";
import { Report } from "../../src/models/reportModel.js";
import { Revision } from "../../src/models/revisionModel.js";
import { createUser } from "../helpers/testAuth.js";
import { clearDb } from "../helpers/testDb.js";
import {
  WEEK,
  api,
  as,
  autosave,
  dayBody,
  filedWeek,
  freezeAt,
  postWeek,
  putDay,
  sendBack,
} from "../helpers/testWeeks.js";

// api_specification.md §2.9 (D1–D8) with the pipelines of database_schema.md §5: users
// first, `status` on D2 only, D6 not week-scoped, content never on a dashboard row.
// 2026-W40 runs Mon 28 Sep – Fri 2 Oct 2026; the clock is frozen on its Friday.

const ghost = "0123456789abcdef01234567";
let admin, managerA, memberX, memberY, memberZ, onLeave, project, other;

beforeEach(async () => {
  await clearDb();
  freezeAt("2026-10-02T12:00:00");
  admin = await createUser({ name: "Admin D.", role: "admin" });
  managerA = await createUser({ name: "Manager A.", role: "manager" });
  await createUser({ name: "Manager B.", role: "manager" });
  memberX = await createUser({ name: "Member X.", role: "member" });
  memberY = await createUser({ name: "Member Y.", role: "member" });
  memberZ = await createUser({ name: "Member Z.", role: "member" });
  onLeave = await createUser({
    name: "Leave L.",
    role: "member",
    leave: [
      {
        from: new Date("2026-09-28T00:00:00.000Z"),
        to: null,
        setBy: admin._id,
      },
    ],
  });
  project = await Project.create({ name: "Client A" });
  other = await Project.create({ name: "Beta" });
});

afterEach(() => {
  vi.useRealTimers();
});

const get = (user, path) => api.get(`/api/dashboard/${path}`).set(as(user));
const week = (path, query = "") => `${path}?weekKey=${WEEK}${query}`;
const team = async (query = "") =>
  (await get(managerA, week("team", `&limit=100${query}`))).body.data;
const rowOf = (data, user) =>
  data.items.find((i) => i.user._id === String(user._id));

const ALL = [
  `summary?weekKey=${WEEK}`,
  `team?weekKey=${WEEK}`,
  `trend?endWeek=${WEEK}`,
  `hours?weekKey=${WEEK}`,
  `workload?weekKey=${WEEK}`,
  "activity",
  `people/${ghost}`,
  `projects?weekKey=${WEEK}`,
];

describe("the role gate", () => {
  it("signed out → 401 on every endpoint", async () => {
    for (const path of ALL) {
      const res = await api.get(`/api/dashboard/${path}`);
      expect(res.status, path).toBe(401);
    }
  });

  it("member → 403 FORBIDDEN on every endpoint", async () => {
    for (const path of ALL) {
      const res = await get(memberX, path);
      expect(res.status, path).toBe(403);
      expect(res.body.error).toEqual({ code: "FORBIDDEN" });
    }
  });

  it("manager and admin → 200 (D7 → 404 for a person who does not exist)", async () => {
    for (const user of [managerA, admin]) {
      for (const path of ALL) {
        const res = await get(user, path);
        expect(res.status, path).toBe(path.startsWith("people/") ? 404 : 200);
      }
    }
  });
});

describe("validation", () => {
  it("weekKey is required and must be a real ISO week", async () => {
    for (const path of ["summary", "team", "hours", "workload", "projects"]) {
      expect((await get(managerA, path)).status, path).toBe(422);
      expect(
        (await get(managerA, `${path}?weekKey=2026-W54`)).status,
        path,
      ).toBe(422);
    }
    const res = await get(managerA, "trend");
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("D2's sort, status and paging are allowlisted", async () => {
    const bad = [
      "&sort=hours",
      "&status=late",
      "&limit=25",
      "&dir=up",
      "&person=nope",
    ];
    for (const query of bad)
      expect((await get(managerA, week("team", query))).status, query).toBe(
        422,
      );
  });

  it("D3's window is 4, 8 or 12 weeks", async () => {
    const path = (w) => `trend?endWeek=${WEEK}&weeks=${w}`;
    for (const w of [4, 8, 12]) {
      const res = await get(managerA, path(w));
      expect(res.status).toBe(200);
      expect(res.body.data.weeks).toHaveLength(w);
      expect(res.body.data.weeks.at(-1)).toBe(WEEK);
    }
    expect((await get(managerA, path(6))).status).toBe(422);
    const def = await get(managerA, `trend?endWeek=${WEEK}`);
    expect(def.body.data.weeks).toHaveLength(8);
  });

  it("D7 rejects a malformed id with 422 and a missing person with 404", async () => {
    expect((await get(managerA, "people/abc")).status).toBe(422);
    const res = await get(managerA, `people/${ghost}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({ code: "USER_NOT_FOUND" });
  });
});

describe("D1 · the metric strip", () => {
  beforeEach(async () => {
    await filedWeek(memberX, project); // submitted
    await postWeek(memberY, project, ["mon", "tue"]); // draft
  });

  it("is built users-first: people who filed nothing are expected, leave is not", async () => {
    const { data } = (await get(managerA, week("summary"))).body;
    // admin, A, B, X, Y, Z are expected; the person on leave is not; only X has filed.
    expect(data).toMatchObject({
      weekKey: WEEK,
      filed: 1,
      expected: 6,
      notFiled: 5,
      onLeave: 1,
      compliance: 1 / 6,
    });
  });

  it("counts a submitted, a needs-correction and an approved week as filed", async () => {
    const view = await filedWeek(memberZ, project);
    await sendBack(view.report._id, managerA);
    const { data } = (await get(managerA, week("summary"))).body;
    expect(data.filed).toBe(2);
    expect(data.needsCorrection.count).toBe(1);
    const revision = await Revision.findOne({ report: view.report._id }).lean();
    expect(data.needsCorrection.oldestSentBackAt).toBe(
      revision.reviewedAt.toISOString(),
    );
  });

  it("the status filter changes the team table and nothing else", async () => {
    const plain = (await get(managerA, week("summary"))).body.data;
    const filtered = (await get(managerA, week("summary", "&status=approved")))
      .body.data;
    expect(filtered).toEqual(plain);
    const rows = await team("&status=submitted");
    expect(rows.items.map((i) => i.user.name)).toEqual(["Member X."]);
  });

  it("the person filter narrows the people counted", async () => {
    const { data } = (
      await get(
        managerA,
        week("summary", `&person=${memberX._id},${memberY._id}`),
      )
    ).body;
    expect(data).toMatchObject({ filed: 1, expected: 2, compliance: 0.5 });
  });

  it("the project filter keeps a row whose lines name the project (I11)", async () => {
    // X and Y named `project`; Z has no lines and is assigned to nothing.
    const { data } = (
      await get(managerA, week("summary", `&project=${project._id}`))
    ).body;
    expect(data).toMatchObject({ filed: 1, expected: 2 });
    // Someone with no lines yet is kept when assigned to the project.
    const { User } = await import("../../src/models/userModel.js");
    await User.updateOne({ _id: memberZ._id }, { projects: [project._id] });
    const again = (
      await get(managerA, week("summary", `&project=${project._id}`))
    ).body.data;
    expect(again.expected).toBe(3);
    const none = (await get(managerA, week("summary", `&project=${other._id}`)))
      .body.data;
    expect(none).toMatchObject({ filed: 0, expected: 0, compliance: null });
  });

  it("an all-holiday week expects nobody, and its rate is null, not zero", async () => {
    const dates = [
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
    ];
    await Holiday.insertMany(
      dates.map((d) => ({
        date: new Date(`${d}T00:00:00.000Z`),
        name: "Closure",
        createdBy: admin._id,
      })),
    );
    const { data } = (await get(managerA, "summary?weekKey=2026-W39")).body;
    expect(data).toMatchObject({
      filed: 0,
      expected: 0,
      onLeave: 0,
      compliance: null,
    });
    const rows = (await get(managerA, "team?weekKey=2026-W39&limit=100")).body
      .data;
    expect(new Set(rows.items.map((i) => i.state))).toEqual(
      new Set(["holiday_week"]),
    );
  });

  it("the trailing rate pools the last eight weeks", async () => {
    const { data } = (await get(managerA, week("summary"))).body;
    // Only W40 has a filed week. Six people are expected in all eight weeks; the person on
    // leave only since Monday is expected in the seven before it.
    expect(data.complianceTrailing.weeks).toBe(8);
    expect(data.complianceTrailing.rate).toBeCloseTo(1 / (6 * 8 + 7), 5);
  });

  it("open blockers count every status and fall when one is resolved", async () => {
    let res = await putDay(
      memberY,
      "wed",
      dayBody({ project, blockers: [{ text: "Waiting on the keys" }] }),
    );
    expect(res.status).toBe(200);
    const view = res.body.data;
    const blocker = view.report.days.find((d) => d.weekday === "wed")
      .blockers[0];
    let { data } = (await get(managerA, week("summary"))).body;
    expect(data.openBlockers).toEqual({ count: 1, peopleCount: 1 });

    res = await api
      .put(`/api/reports/${view.report._id}/blockers/${blocker._id}/resolution`)
      .set(as(managerA));
    expect(res.status).toBe(200);
    ({ data } = (await get(managerA, week("summary"))).body);
    expect(data.openBlockers).toEqual({ count: 0, peopleCount: 0 });
  });
});

describe("D2 · the team table", () => {
  it("has a row for everyone on the team, with the report null where there is none", async () => {
    await filedWeek(memberX, project);
    await postWeek(memberY, project, ["mon"]);
    const data = await team();
    expect(data.items).toHaveLength(7);
    expect(data.meta).toMatchObject({ page: 1, limit: 100, total: 7 });
    const states = Object.fromEntries(
      data.items.map((i) => [i.user.name, i.state]),
    );
    expect(states).toMatchObject({
      "Member X.": "submitted",
      "Member Y.": "draft",
      "Member Z.": "not_started",
      "Leave L.": "on_leave",
    });
    for (const name of ["Member Z.", "Leave L."])
      expect(data.items.find((i) => i.user.name === name).report).toBeNull();
    expect(rowOf(data, memberY).report).toMatchObject({ tasksDone: null });
    expect(rowOf(data, memberX).report).toMatchObject({
      revisionNumber: 1,
      tasksDone: 1,
      taskCount: 1,
    });
    expect(rowOf(data, memberX)).toMatchObject({
      postedWeekdays: ["mon", "tue", "wed", "thu", "fri"],
      hours: 20,
      approvalRequested: false,
      projects: [{ name: "Client A", status: "active" }],
    });
    expect(rowOf(data, memberY).dayStates.mon).toBe("posted");
    expect(rowOf(data, memberY).dayStates.fri).toBe("today");
    expect(rowOf(data, onLeave).dayStates.mon).toBe("leave");
  });

  it("never serves a draft's task statuses or notes, nor any content", async () => {
    const view = await postWeek(memberY, project, ["mon"]);
    const tasks = view.report.tasks.map((t) => ({
      task: t.task._id,
      status: "done",
      note: "SECRET-NOTE",
    }));
    expect(
      (
        await autosave(memberY, view.report._id, {
          tasks,
          notes: "SECRET-NOTES",
        })
      ).status,
    ).toBe(200);
    const res = await get(managerA, week("team", "&limit=100"));
    expect(JSON.stringify(res.body)).not.toMatch(/SECRET/);
    expect(rowOf(res.body.data, memberY).report.tasksDone).toBeNull();
    // …and the trend counts submitted reports only.
    const trend = (await get(managerA, `trend?endWeek=${WEEK}&weeks=4`)).body
      .data;
    expect(trend.team.at(-1).tasksDone).toBe(0);
  });

  it("reads a Needs-correction row from the sent-back revision (I13)", async () => {
    const view = await filedWeek(memberX, project, { status: "done" });
    await sendBack(view.report._id, managerA);
    const tasks = view.report.tasks.map((t) => ({
      task: t.task._id,
      status: "in_progress",
      note: "",
    }));
    await autosave(memberX, view.report._id, { tasks });
    const data = await team();
    expect(rowOf(data, memberX)).toMatchObject({
      state: "needs_correction",
      report: { tasksDone: 1, revisionNumber: 1 },
    });
    const trend = (await get(managerA, `trend?endWeek=${WEEK}&weeks=4`)).body
      .data;
    expect(trend.team.at(-1).tasksDone).toBe(1);
  });

  it("sorts by name (default), status and lastActivityAt, and pages", async () => {
    await filedWeek(memberX, project);
    await postWeek(memberY, project, ["mon"]);
    let data = await team();
    expect(data.items.map((i) => i.user.name)).toEqual(
      [...data.items.map((i) => i.user.name)].sort((a, b) =>
        a.localeCompare(b),
      ),
    );
    data = await team("&sort=status");
    expect(data.items.map((i) => i.state)).toEqual([
      "not_started",
      "not_started",
      "not_started",
      "not_started",
      "on_leave",
      "draft",
      "submitted",
    ]);
    data = await team("&sort=status&dir=desc");
    expect(data.items[0].state).toBe("submitted");
    data = await team("&sort=lastActivityAt&dir=desc");
    expect(data.items[0].user.name).toBe("Member X.");
    const page = (await get(managerA, week("team", "&limit=20&page=2"))).body
      .data;
    expect(page.items).toEqual([]);
    expect(page.meta).toMatchObject({ page: 2, total: 7, totalPages: 1 });
  });

  it("the status filter takes a comma list of week states", async () => {
    await filedWeek(memberX, project);
    const data = await team("&status=on_leave,submitted");
    expect(data.items.map((i) => i.state).sort()).toEqual([
      "on_leave",
      "submitted",
    ]);
  });
});

describe("D3 · tasks completed", () => {
  it("counts Done tasks in submitted reports, every week present, per person on request", async () => {
    await filedWeek(memberX, project, { status: "done" });
    await filedWeek(memberY, project, { status: "in_progress" });
    const { data } = (
      await get(
        managerA,
        `trend?endWeek=${WEEK}&weeks=4&trendPerson=${memberX._id}`,
      )
    ).body;
    expect(data.weeks).toEqual([
      "2026-W37",
      "2026-W38",
      "2026-W39",
      "2026-W40",
    ]);
    expect(data.team).toEqual([
      { weekKey: "2026-W37", tasksDone: 0 },
      { weekKey: "2026-W38", tasksDone: 0 },
      { weekKey: "2026-W39", tasksDone: 0 },
      { weekKey: "2026-W40", tasksDone: 1 },
    ]);
    expect(data.person.at(-1)).toEqual({ weekKey: "2026-W40", tasksDone: 1 });
    const noPerson = (await get(managerA, `trend?endWeek=${WEEK}`)).body.data;
    expect(noPerson.person).toBeNull();
    const narrowed = (
      await get(managerA, `trend?endWeek=${WEEK}&person=${memberY._id}`)
    ).body.data;
    expect(narrowed.team.at(-1).tasksDone).toBe(0);
  });
});

describe("D4, D5 · hours", () => {
  it("D4 lists the seven types in fixed order and reads Draft weeks too", async () => {
    await postWeek(memberY, project, ["mon", "tue"]); // 2 × 4 h, draft
    const { data } = (await get(managerA, week("hours"))).body;
    expect(data.items.map((i) => i.type)).toEqual([
      "development",
      "testing",
      "meetings",
      "documentation",
      "review",
      "research_study",
      "other",
    ]);
    expect(data.items[0]).toEqual({ type: "development", hours: 8 });
    expect(data.total).toBe(8);
  });

  it("D5 splits hours by task type and sorts projects by total, busiest first", async () => {
    await postWeek(memberY, other, ["mon"]); // 4 h on Beta
    await postWeek(memberX, project, ["mon", "tue", "wed"]); // 12 h on Client A
    const { data } = (await get(managerA, week("workload"))).body;
    expect(data.items.map((i) => [i.project.name, i.totalHours])).toEqual([
      ["Client A", 12],
      ["Beta", 4],
    ]);
    expect(data.items[0].hours).toMatchObject({ development: 12, other: 0 });
  });

  it("the person filter narrows both", async () => {
    await postWeek(memberY, other, ["mon"]);
    await postWeek(memberX, project, ["mon"]);
    const q = `&person=${memberY._id}`;
    expect((await get(managerA, week("hours", q))).body.data.total).toBe(4);
    const w = (await get(managerA, week("workload", q))).body.data;
    expect(w.items.map((i) => i.project.name)).toEqual(["Beta"]);
  });
});

describe("D6 · recent activity", () => {
  it("is the latest eight events across all weeks, newest first, whatever weekKey says", async () => {
    for (const user of [memberX, memberY, memberZ])
      await filedWeek(user, project);
    const res = await get(managerA, "activity?weekKey=2020-W01");
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(3);
    // One more event of each kind.
    const report = await Report.findOne({ author: memberX._id }).lean();
    await sendBack(report._id, managerA);
    const items = (await get(managerA, "activity")).body.data.items;
    expect(items[0]).toMatchObject({
      type: "sent_back",
      revisionNumber: 1,
      actor: { name: "Manager A." },
      report: {
        weekKey: WEEK,
        status: "needs_correction",
        author: { name: "Member X." },
      },
    });
    expect(items.map((i) => i.type).sort()).toEqual([
      "sent_back",
      "submitted",
      "submitted",
      "submitted",
    ]);
  });

  it("returns at most eight", async () => {
    const users = [];
    for (let i = 0; i < 10; i += 1)
      users.push(await createUser({ name: `P${i}.` }));
    for (const user of users) await filedWeek(user, project);
    const items = (await get(managerA, "activity")).body.data.items;
    expect(items).toHaveLength(8);
    const times = items.map((i) => new Date(i.at).getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it("has no limit parameter and an unreviewed submission is one event", async () => {
    await filedWeek(memberX, project);
    const items = (await get(managerA, "activity?limit=100")).body.data.items;
    expect(items.map((i) => i.type)).toEqual(["submitted"]);
  });
});

describe("D7 · a person's strip", () => {
  it("counts filed weeks over their work periods, leave and holiday weeks excluded", async () => {
    // Memberships run from 2026-01-05 (W02) to W40, 39 weeks, none on leave but one
    // holiday week below; X files W40 and was sent back once.
    const view = await filedWeek(memberX, project);
    await sendBack(view.report._id, managerA);
    const holiday = [
      "2026-09-14",
      "2026-09-15",
      "2026-09-16",
      "2026-09-17",
      "2026-09-18",
    ];
    await Holiday.insertMany(
      holiday.map((d) => ({
        date: new Date(`${d}T00:00:00.000Z`),
        name: "Closure",
        createdBy: admin._id,
      })),
    );
    const { data } = (await get(managerA, `people/${memberX._id}`)).body;
    expect(data).toEqual({
      reportsFiled: 1,
      compliance: 1 / 38,
      avgHoursPerWeek: 20 / 38,
      corrections: 1,
    });
  });

  it("a person on leave only this week has a zero rate over the weeks before", async () => {
    const { data } = (await get(managerA, `people/${onLeave._id}`)).body;
    expect(data.reportsFiled).toBe(0);
    expect(data.corrections).toBe(0);
    expect(data.compliance).toBe(0); // the earlier weeks are expected of them, W40 is not
    expect(data.avgHoursPerWeek).toBe(0);
  });

  it("a person who has not joined yet has nothing to count", async () => {
    const { User } = await import("../../src/models/userModel.js");
    const invited = await User.create({
      name: "",
      email: "invited@example.com",
      role: "member",
      status: "invited",
    });
    const { data } = (await get(managerA, `people/${invited._id}`)).body;
    expect(data).toEqual({
      reportsFiled: 0,
      compliance: null,
      avgHoursPerWeek: null,
      corrections: 0,
    });
  });
});

describe("D8 · the projects table", () => {
  const plan = {
    startDate: new Date("2026-09-28T00:00:00.000Z"),
    plannedDays: 10,
  };

  it("lists active projects with a plan; people sorted by total hours", async () => {
    await Project.updateOne({ _id: project._id }, { plan });
    await Project.create({ name: "Retired", status: "inactive", plan });
    // `other` has no plan.
    await postWeek(memberX, project, ["mon", "tue"]); // 8 h
    await postWeek(memberY, project, ["mon"]); // 4 h
    const { data } = (await get(managerA, week("projects"))).body;
    expect(data.items).toHaveLength(1);
    const [item] = data.items;
    expect(item.project).toMatchObject({ name: "Client A", status: "active" });
    expect(item.progress).toMatchObject({
      daysUsed: 5,
      daysLeft: 5,
      overdueDays: 0,
      hoursLogged: 12,
    });
    expect(
      item.people.map((p) => [
        p.user.name,
        p.hoursThisWeek,
        p.hoursTotal,
        p.lastDay,
      ]),
    ).toEqual([
      ["Member X.", 8, 8, "2026-09-29"],
      ["Member Y.", 4, 4, "2026-09-28"],
    ]);
  });

  it("splits this week from the total", async () => {
    await Project.updateOne({ _id: project._id }, { plan });
    await postWeek(memberX, project, ["mon"]);
    await postWeek(memberX, project, ["mon"], "2026-W39");
    const now = (await get(managerA, week("projects"))).body.data.items[0];
    expect(now.people[0]).toMatchObject({ hoursThisWeek: 4, hoursTotal: 8 });
    const before = (await get(managerA, "projects?weekKey=2026-W38")).body.data
      .items[0];
    expect(before.people[0]).toMatchObject({ hoursThisWeek: 0, hoursTotal: 8 });
  });
});
