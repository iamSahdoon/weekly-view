import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { Holiday } from "../../src/models/holidayModel.js";
import { Project } from "../../src/models/projectModel.js";
import { Report } from "../../src/models/reportModel.js";
import { Task } from "../../src/models/taskModel.js";
import { User } from "../../src/models/userModel.js";
import { bearer, createUser } from "../helpers/testAuth.js";
import { clearDb } from "../helpers/testDb.js";

// P1–P5 and T1 (api_specification.md §2.3, §2.4), with project progress derived per
// database_schema.md §5.3. Wrong-role rows for P2–P5 are in adminRoutes.test.js (33).

const api = request(app);
const ghost = "0123456789abcdef01234567";
const d = (s) => new Date(`${s}T00:00:00.000Z`);

let admin, manager, memberX, memberY;

beforeEach(async () => {
  await clearDb();
  admin = await createUser({ name: "Admin A.", role: "admin" });
  manager = await createUser({ name: "Manager M.", role: "manager" });
  memberX = await createUser({ name: "Member X.", role: "member" });
  memberY = await createUser({ name: "Member Y.", role: "member" });
});

afterEach(() => {
  vi.useRealTimers();
});

const as = (user) => ({ Authorization: bearer(user) });

/** Freezes the clock (Date only) at noon UTC on `date`. Tokens are signed after this. */
function today(date) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${date}T12:00:00.000Z`));
}

async function createProject(body, user = manager) {
  const res = await api.post("/api/projects").set(as(user)).send(body);
  expect(res.status).toBe(201);
  return res.body.data;
}

const list = (user, query = "") =>
  api.get(`/api/projects${query}`).set(as(user));

const progressOf = async (projectId, user = manager) => {
  const res = await list(user, "?status=all");
  return res.body.data.items.find((p) => p._id === String(projectId)).progress;
};

/** A report with one day of lines; each line is [task, hours]. */
async function reportWith(author, weekKey, lines, status = "draft") {
  const [year, week] = weekKey.split("-W").map(Number);
  // Weeks used here are all in 2026; Monday of W1 2026 is 29 Dec 2025.
  const monday = new Date(Date.UTC(2025, 11, 29 + (week - 1) * 7));
  expect(year).toBe(2026);
  return Report.create({
    author: author._id,
    weekKey,
    weekStart: monday,
    weekEnd: new Date(monday.getTime() + 4 * 86400000),
    status,
    days: [
      {
        weekday: "mon",
        postedAt: monday,
        lines: lines.map(([task, hours]) => ({
          task: task._id,
          project: task.project,
          taskType: "development",
          text: "Worked on it",
          hours,
        })),
      },
    ],
  });
}

describe("P2 · create a project", () => {
  it("returns a manager item with members and a plan", async () => {
    today("2026-09-08");
    const item = await createProject({
      name: "  Client A ",
      description: "The big one",
      memberIds: [String(memberX._id), String(memberY._id)],
      plan: { startDate: "2026-09-07", plannedDays: 20, plannedHours: 160 },
    });
    expect(item).toMatchObject({
      name: "Client A",
      description: "The big one",
      status: "active",
      memberCount: 2,
      taskCount: 0,
      progress: {
        plan: { startDate: "2026-09-07", plannedDays: 20, plannedHours: 160 },
        daysUsed: 2,
        daysLeft: 18,
        overdueDays: 0,
        hoursLogged: 0,
        planHistory: [],
      },
    });
    expect(item.memberIds.sort()).toEqual(
      [String(memberX._id), String(memberY._id)].sort(),
    );
    expect(item.createdAt).toBeTruthy();
    const x = await User.findById(memberX._id).lean();
    expect(x.projects.map(String)).toEqual([item._id]);
  });

  it("without a plan → progress null; description defaults to ''", async () => {
    const item = await createProject({ name: "R&D" });
    expect(item).toMatchObject({
      description: "",
      progress: null,
      memberIds: [],
      memberCount: 0,
    });
    const stored = await Project.findById(item._id).lean();
    expect(stored.plan).toBeNull();
  });

  it("a name taken by any project, case-insensitively → 409 PROJECT_NAME_TAKEN", async () => {
    const first = await createProject({ name: "Client A" });
    await api.post(`/api/projects/${first._id}/deactivate`).set(as(manager));
    const res = await api
      .post("/api/projects")
      .set(as(admin))
      .send({ name: "client a" });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: "PROJECT_NAME_TAKEN" });
  });

  it.each([
    [
      "a weekend start",
      { startDate: "2026-09-05", plannedDays: 5 },
      "plan.startDate",
    ],
    [
      "zero days",
      { startDate: "2026-09-07", plannedDays: 0 },
      "plan.plannedDays",
    ],
    [
      "1001 days",
      { startDate: "2026-09-07", plannedDays: 1001 },
      "plan.plannedDays",
    ],
    [
      "half a day",
      { startDate: "2026-09-07", plannedDays: 1.5 },
      "plan.plannedDays",
    ],
    [
      "zero hours",
      { startDate: "2026-09-07", plannedDays: 5, plannedHours: 0 },
      "plan.plannedHours",
    ],
    [
      "not a date",
      { startDate: "2026-02-30", plannedDays: 5 },
      "plan.startDate",
    ],
  ])("%s → 422", async (label, plan, field) => {
    const res = await api
      .post("/api/projects")
      .set(as(manager))
      .send({ name: "P", plan });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(res.body.error.fields).toHaveProperty([field]);
  });

  it("an empty name → 422; a removed or unknown member → 422 on memberIds", async () => {
    let res = await api
      .post("/api/projects")
      .set(as(manager))
      .send({ name: " " });
    expect(res.status).toBe(422);
    expect(res.body.error.fields).toHaveProperty("name");

    const gone = await createUser({ status: "removed" });
    for (const id of [String(gone._id), ghost]) {
      res = await api
        .post("/api/projects")
        .set(as(manager))
        .send({ name: "P", memberIds: [id] });
      expect(res.status).toBe(422);
      expect(res.body.error.fields).toEqual({
        memberIds: "Pick people who are on the team.",
      });
    }
    expect(await Project.countDocuments()).toBe(0);
  });
});

describe("P1 · list projects", () => {
  let alpha, beta;

  beforeEach(async () => {
    today("2026-09-08");
    alpha = await createProject({
      name: "alpha",
      memberIds: [String(memberX._id)],
      plan: { startDate: "2026-09-07", plannedDays: 10 },
    });
    beta = await createProject({
      name: "Beta",
      plan: { startDate: "2026-09-07", plannedDays: 10 },
    });
    await createProject({
      name: "Gamma",
      memberIds: [String(memberX._id)],
    });
  });

  it("a member gets the base shape, with progress only where assigned", async () => {
    const res = await list(memberX);
    expect(res.status).toBe(200);
    const [a, b, g] = res.body.data.items;
    expect(res.body.data).not.toHaveProperty("meta");
    expect(Object.keys(a).sort()).toEqual(
      ["_id", "description", "name", "progress", "status"].sort(),
    );
    expect(a.progress).toMatchObject({ daysUsed: 2, daysLeft: 8 });
    expect(Object.keys(b).sort()).toEqual(
      ["_id", "description", "name", "status"].sort(),
    );
    expect(g.progress).toBeNull(); // assigned, but no plan

    const y = await list(memberY);
    expect(y.body.data.items.every((p) => !("progress" in p))).toBe(true);
  });

  it("managers and admins get progress on every planned project and the extras", async () => {
    for (const user of [manager, admin]) {
      const res = await list(user);
      const [a, b, g] = res.body.data.items;
      expect(a).toMatchObject({ memberCount: 1, taskCount: 0 });
      expect(b.progress).toMatchObject({ daysUsed: 2, daysLeft: 8 });
      expect(b).toMatchObject({ memberIds: [], memberCount: 0 });
      expect(g.progress).toBeNull();
    }
  });

  it("sorts by name case-insensitively; status, mine and usedInWeek filter", async () => {
    let res = await list(memberX);
    expect(res.body.data.items.map((p) => p.name)).toEqual([
      "alpha",
      "Beta",
      "Gamma",
    ]);

    await api.post(`/api/projects/${beta._id}/deactivate`).set(as(manager));
    res = await list(memberX);
    expect(res.body.data.items.map((p) => p.name)).toEqual(["alpha", "Gamma"]);
    res = await list(memberX, "?status=inactive");
    expect(res.body.data.items.map((p) => p.name)).toEqual(["Beta"]);
    res = await list(memberX, "?status=all");
    expect(res.body.data.items).toHaveLength(3);

    res = await list(memberX, "?mine=true");
    expect(res.body.data.items.map((p) => p.name)).toEqual(["alpha", "Gamma"]);
    res = await list(memberY, "?mine=true");
    expect(res.body.data.items).toEqual([]);

    // An inactive project named by a line that week joins the active ones.
    const task = await Task.create({
      owner: memberY._id,
      name: "T",
      project: beta._id,
    });
    await reportWith(memberY, "2026-W37", [[task, 2]]);
    res = await list(manager, "?usedInWeek=2026-W37");
    expect(res.body.data.items.map((p) => p.name)).toEqual([
      "alpha",
      "Beta",
      "Gamma",
    ]);
    res = await list(manager, "?usedInWeek=2026-W38");
    expect(res.body.data.items.map((p) => p.name)).toEqual(["alpha", "Gamma"]);
  });

  it("rejects bad filters with 422", async () => {
    for (const q of ["?status=gone", "?mine=yes", "?usedInWeek=2026-W60"]) {
      const res = await list(memberX, q);
      expect(res.status).toBe(422);
    }
  });

  it("hours logged sum every line naming the project, any status; taskCount counts tasks", async () => {
    const t1 = await Task.create({
      owner: memberX._id,
      name: "One",
      project: alpha._id,
    });
    const t2 = await Task.create({
      owner: memberY._id,
      name: "Two",
      project: alpha._id,
    });
    const other = await Task.create({
      owner: memberY._id,
      name: "B",
      project: beta._id,
    });
    await reportWith(
      memberX,
      "2026-W36",
      [
        [t1, 3],
        [t1, 1.25],
      ],
      "approved",
    );
    await reportWith(memberY, "2026-W37", [
      [t2, 2.5],
      [other, 4],
    ]);

    const res = await list(manager);
    const [a, b] = res.body.data.items;
    expect(a.progress.hoursLogged).toBe(6.75);
    expect(a.taskCount).toBe(2);
    expect(b.progress.hoursLogged).toBe(4);
  });
});

describe("S3 done list · progress over time", () => {
  let project;

  beforeEach(async () => {
    today("2026-09-07"); // a Monday
    project = await createProject({
      name: "Twenty days",
      plan: { startDate: "2026-09-07", plannedDays: 20 },
    });
  });

  it("a 20-day plan from a Monday shows 19 left after that Monday", async () => {
    expect(await progressOf(project._id)).toMatchObject({
      daysUsed: 1,
      daysLeft: 19,
      overdueDays: 0,
    });
    today("2026-09-08");
    expect(await progressOf(project._id)).toMatchObject({
      daysUsed: 2,
      daysLeft: 18,
    });
    today("2026-09-13"); // Sunday: the weekend uses nothing
    expect(await progressOf(project._id)).toMatchObject({
      daysUsed: 5,
      daysLeft: 15,
    });
  });

  it("is untouched before its start date", async () => {
    today("2026-09-04");
    expect(await progressOf(project._id)).toMatchObject({
      daysUsed: 0,
      daysLeft: 20,
    });
  });

  it("'overdue by N' appears on day 21", async () => {
    today("2026-10-02"); // day 20
    expect(await progressOf(project._id)).toMatchObject({
      daysUsed: 20,
      daysLeft: 0,
      overdueDays: 0,
    });
    today("2026-10-05"); // day 21
    expect(await progressOf(project._id)).toMatchObject({
      daysUsed: 21,
      daysLeft: 0,
      overdueDays: 1,
    });
    today("2026-10-09");
    expect(await progressOf(project._id)).toMatchObject({ overdueDays: 5 });
  });

  it("skips an added holiday; adding or removing one changes nothing stored", async () => {
    await reportWith(memberX, "2026-W37", [
      [
        await Task.create({
          owner: memberX._id,
          name: "T",
          project: project._id,
        }),
        2,
      ],
    ]);
    const snapshot = async () => ({
      projects: await Project.find().lean(),
      reports: await Report.find().lean(),
      tasks: await Task.find().lean(),
      users: await User.find().lean(),
    });
    const before = await snapshot();

    today("2026-09-08");
    expect(await progressOf(project._id)).toMatchObject({
      daysUsed: 2,
      daysLeft: 18,
    });

    const added = await api
      .post("/api/holidays")
      .set(as(admin))
      .send({ date: "2026-09-08", name: "Poya" });
    expect(added.status).toBe(201);
    expect(await progressOf(project._id)).toMatchObject({
      daysUsed: 1,
      daysLeft: 19,
    });
    expect(await snapshot()).toEqual(before);

    // Day 21 moves to Tuesday 6 October.
    today("2026-10-05");
    expect(await progressOf(project._id)).toMatchObject({
      daysUsed: 20,
      overdueDays: 0,
    });
    today("2026-10-06");
    expect(await progressOf(project._id)).toMatchObject({
      daysUsed: 21,
      overdueDays: 1,
    });

    const removed = await api
      .delete(`/api/holidays/${added.body.data._id}`)
      .set(as(admin));
    expect(removed.status).toBe(200);
    expect(await progressOf(project._id)).toMatchObject({
      daysUsed: 22,
      overdueDays: 2,
    });
    expect(await snapshot()).toEqual(before);
    expect(await Holiday.countDocuments()).toBe(0);
  });
});

describe("P3 · edit a project", () => {
  it("renames, re-describes, and replaces membership", async () => {
    const removed = await createUser({ status: "removed" });
    const p = await createProject({
      name: "Old",
      memberIds: [String(memberX._id)],
    });
    await User.updateOne({ _id: removed._id }, { $set: { projects: [p._id] } });

    const res = await api
      .patch(`/api/projects/${p._id}`)
      .set(as(manager))
      .send({
        name: "New",
        description: "Now",
        memberIds: [String(memberY._id)],
      });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      name: "New",
      description: "Now",
      memberIds: [String(memberY._id)],
      memberCount: 1,
    });
    expect((await User.findById(memberX._id).lean()).projects).toEqual([]);
    expect(
      (await User.findById(memberY._id).lean()).projects.map(String),
    ).toEqual([p._id]);
    // A removed person's record is left as it was.
    expect(
      (await User.findById(removed._id).lean()).projects.map(String),
    ).toEqual([p._id]);

    const cleared = await api
      .patch(`/api/projects/${p._id}`)
      .set(as(manager))
      .send({ memberIds: [] });
    expect(cleared.body.data.memberIds).toEqual([]);
  });

  it("404 PROJECT_NOT_FOUND, 409 PROJECT_NAME_TAKEN, 422 on an empty body", async () => {
    const a = await createProject({ name: "A" });
    await createProject({ name: "B" });
    let res = await api
      .patch(`/api/projects/${ghost}`)
      .set(as(manager))
      .send({ name: "C" });
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({ code: "PROJECT_NOT_FOUND" });
    res = await api
      .patch(`/api/projects/${a._id}`)
      .set(as(manager))
      .send({ name: "b" });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: "PROJECT_NAME_TAKEN" });
    res = await api.patch(`/api/projects/${a._id}`).set(as(manager)).send({});
    expect(res.status).toBe(422);
    res = await api
      .patch("/api/projects/not-an-id")
      .set(as(manager))
      .send({ name: "C" });
    expect(res.status).toBe(422);
  });
});

describe("P4 · set or extend the plan", () => {
  it("sets a first plan without history, then keeps every earlier plan", async () => {
    today("2026-09-08");
    const p = await createProject({ name: "Planned" });
    let res = await api
      .put(`/api/projects/${p._id}/plan`)
      .set(as(manager))
      .send({ startDate: "2026-09-07", plannedDays: 20, plannedHours: null });
    expect(res.status).toBe(200);
    expect(res.body.data.progress).toMatchObject({
      plan: { startDate: "2026-09-07", plannedDays: 20, plannedHours: null },
      planHistory: [],
    });

    res = await api
      .put(`/api/projects/${p._id}/plan`)
      .set(as(admin))
      .send({ startDate: "2026-09-07", plannedDays: 25, plannedHours: 200 });
    expect(res.status).toBe(200);
    const { progress } = res.body.data;
    expect(progress.plan).toEqual({
      startDate: "2026-09-07",
      plannedDays: 25,
      plannedHours: 200,
    });
    expect(progress.daysLeft).toBe(23);
    expect(progress.planHistory).toEqual([
      {
        startDate: "2026-09-07",
        plannedDays: 20,
        plannedHours: null,
        changedAt: "2026-09-08T12:00:00.000Z",
        changedBy: {
          _id: String(admin._id),
          name: "Admin A.",
          role: "admin",
          status: "active",
          onLeave: false,
        },
      },
    ]);
    const stored = await Project.findById(p._id).lean();
    expect(stored.planHistory).toHaveLength(1);
    expect(stored.plan.startDate).toEqual(d("2026-09-07"));
  });

  it("404 PROJECT_NOT_FOUND; 422 on a weekend start or a missing field", async () => {
    let res = await api
      .put(`/api/projects/${ghost}/plan`)
      .set(as(manager))
      .send({ startDate: "2026-09-07", plannedDays: 5 });
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({ code: "PROJECT_NOT_FOUND" });
    const p = await createProject({ name: "P" });
    res = await api
      .put(`/api/projects/${p._id}/plan`)
      .set(as(manager))
      .send({ startDate: "2026-09-06", plannedDays: 5 });
    expect(res.status).toBe(422);
    res = await api
      .put(`/api/projects/${p._id}/plan`)
      .set(as(manager))
      .send({ startDate: "2026-09-07" });
    expect(res.status).toBe(422);
  });
});

describe("P5 · deactivate", () => {
  it("is idempotent, leaves tasks alone, and the name stays reserved", async () => {
    const p = await createProject({ name: "Client A" });
    const task = await Task.create({
      owner: memberX._id,
      name: "T",
      project: p._id,
    });
    for (let i = 0; i < 2; i += 1) {
      const res = await api
        .post(`/api/projects/${p._id}/deactivate`)
        .set(as(manager));
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ status: "inactive", taskCount: 1 });
    }
    expect(String((await Task.findById(task._id).lean()).project)).toBe(p._id);
    expect((await list(memberX)).body.data.items).toEqual([]);
    const res = await api
      .post(`/api/projects/${ghost}/deactivate`)
      .set(as(manager));
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({ code: "PROJECT_NOT_FOUND" });
  });
});

describe("T1 · my tasks", () => {
  it("serves only the actor's tasks, open unless includeDone, with hours and last week", async () => {
    const p = await createProject({ name: "P" });
    const open = await Task.create({
      owner: memberX._id,
      name: "Checkout",
      project: p._id,
    });
    const done = await Task.create({
      owner: memberX._id,
      name: "Audit",
      project: p._id,
      doneAt: new Date("2026-09-11T16:00:00Z"),
    });
    const theirs = await Task.create({
      owner: memberY._id,
      name: "Mine",
      project: p._id,
    });
    await reportWith(
      memberX,
      "2026-W36",
      [
        [open, 3],
        [done, 2],
      ],
      "submitted",
    );
    await reportWith(memberX, "2026-W37", [[open, 1.5]]);
    await reportWith(memberY, "2026-W38", [[theirs, 8]]);

    let res = await api.get("/api/tasks").set(as(memberX));
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([
      {
        _id: String(open._id),
        name: "Checkout",
        project: { _id: p._id, name: "P", status: "active" },
        doneAt: null,
        hoursTotal: 4.5,
        lastWeekKey: "2026-W37",
      },
    ]);

    res = await api.get("/api/tasks?includeDone=true").set(as(memberX));
    expect(
      res.body.data.items.map((t) => [t.name, t.hoursTotal, t.lastWeekKey]),
    ).toEqual([
      ["Audit", 2, "2026-W36"],
      ["Checkout", 4.5, "2026-W37"],
    ]);

    res = await api.get("/api/tasks").set(as(manager));
    expect(res.body.data.items).toEqual([]);
    res = await api.get("/api/tasks?includeDone=1").set(as(memberX));
    expect(res.status).toBe(422);
  });

  it("a task with no lines yet has 0 hours and no week", async () => {
    const p = await createProject({ name: "P" });
    await Task.create({ owner: memberX._id, name: "New", project: p._id });
    const res = await api.get("/api/tasks").set(as(memberX));
    expect(res.body.data.items[0]).toMatchObject({
      hoursTotal: 0,
      lastWeekKey: null,
    });
  });
});

describe("authentication", () => {
  it.each([
    ["get", "/api/projects"],
    ["get", "/api/tasks"],
    ["get", "/api/holidays?from=2026-01-01&to=2026-12-31"],
  ])("%s %s without a token → 401", async (method, path) => {
    const res = await api[method](path);
    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({ code: "UNAUTHENTICATED" });
  });
});
