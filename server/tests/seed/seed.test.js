import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { Holiday } from "../../src/models/holidayModel.js";
import { Project } from "../../src/models/projectModel.js";
import { Report } from "../../src/models/reportModel.js";
import { Revision } from "../../src/models/revisionModel.js";
import { SeenMark } from "../../src/models/seenMarkModel.js";
import { Task } from "../../src/models/taskModel.js";
import { User } from "../../src/models/userModel.js";
import { runSeed } from "../../src/seed/index.js";
import { PASSWORD, buildDataset } from "../../src/seed/seedData.js";
import { shiftWeek } from "../../src/utils/weeks.js";
import { bearer } from "../helpers/testAuth.js";
import { clearDb } from "../helpers/testDb.js";

// database_schema.md §8, tech_stack.md §6.8: the dataset is deterministic, relative to
// the week it runs in, and holds every status and week state in the current week —
// reachable through the API without a single write.

const api = request(app);
const NOW = new Date("2026-10-01T12:00:00.000Z"); // Thursday of 2026-W40
const WEEK = "2026-W40";
let nadia, imali;

const freeze = (now) => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
};

async function seedAt(now) {
  freeze(now);
  await clearDb();
  const result = await runSeed({ now });
  nadia = await User.findOne({ email: "nadia@example.com" }).lean();
  imali = await User.findOne({ email: "imali@example.com" }).lean();
  return result;
}
const get = (user, path) =>
  api.get(`/api/dashboard/${path}`).set({ Authorization: bearer(user) });
const teamOf = async (weekKey) =>
  (await get(nadia, `team?weekKey=${weekKey}&limit=100`)).body.data.items;
const byName = (items, name) => items.find((i) => i.user.name === name);

afterEach(() => {
  vi.useRealTimers();
});

describe("the dataset", () => {
  it("is deterministic: the same moment builds the same documents, ids included", () => {
    const a = JSON.stringify(buildDataset(NOW));
    const b = JSON.stringify(buildDataset(new Date(NOW.getTime() + 3600_000)));
    expect(b).toBe(a); // an hour later is the same week
    expect(
      JSON.stringify(buildDataset(new Date("2026-10-08T12:00:00.000Z"))),
    ).not.toBe(a);
  });

  it("seeds all seven collections and can be run again", async () => {
    const first = await seedAt(NOW);
    expect(first.currentWeek).toBe(WEEK);
    expect(first.counts).toMatchObject({
      users: 11,
      projects: 5,
      holidays: 8,
      seenMarks: 5,
    });
    expect(first.counts.tasks).toBeGreaterThanOrEqual(25);
    expect(first.counts.reports).toBeGreaterThanOrEqual(40);
    const second = await runSeed({ now: NOW });
    expect(second.counts).toEqual(first.counts);
    expect(await User.countDocuments()).toBe(11);
    expect(await Report.countDocuments()).toBe(first.counts.reports);
    expect(await SeenMark.countDocuments()).toBe(5);
  });
});

describe("the people", () => {
  beforeEach(() => seedAt(NOW));

  it("has the fixed cast, one owner, and a password that logs in", async () => {
    const names = (await User.find({ status: "active" }).lean()).map(
      (u) => u.name,
    );
    for (const name of [
      "Nadia F.",
      "Ruwan P.",
      "Imali J.",
      "Tharindu S.",
      "Ayesha C.",
      "Dinesh K.",
      "Malith W.",
      "Sanduni B.",
    ])
      expect(names).toContain(name);
    const owners = await User.find({ isOwner: true }).lean();
    expect(owners.map((u) => [u.name, u.role])).toEqual([
      ["Sanduni B.", "admin"],
    ]);
    const roles = (await User.find().lean()).map((u) => u.role);
    expect(new Set(roles)).toEqual(new Set(["admin", "manager", "member"]));
    const res = await api
      .post("/api/auth/login")
      .send({ email: "ruwan@example.com", password: PASSWORD });
    expect(res.status).toBe(200);
  });

  it("has an invited person with a live link, a removed person, and a re-hired one", async () => {
    const invited = await User.findOne({ status: "invited" })
      .select("+linkTokenHash")
      .lean();
    expect(invited.linkTokenPurpose).toBe("invite");
    expect(invited.linkTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(invited.linkTokenExpiresAt.getTime()).toBeGreaterThan(NOW.getTime());
    expect(invited.passwordHash).toBeUndefined();
    const removed = await User.findOne({ status: "removed" }).lean();
    expect(removed.workPeriods).toHaveLength(1);
    expect(removed.workPeriods[0].to).toBeInstanceOf(Date);
    const rehired = await User.findOne({ name: "Lakmal H." }).lean();
    expect(rehired.workPeriods).toHaveLength(2);
    expect(rehired.workPeriods[0].to.getTime()).toBeLessThan(
      rehired.workPeriods[1].from.getTime(),
    );
  });

  it("the invite's raw token is nowhere: only its hash is stored", async () => {
    const invited = await User.findOne({ status: "invited" })
      .select("+linkTokenHash")
      .lean();
    expect(JSON.stringify(invited)).not.toMatch(/\/invite\//);
  });
});

describe("the current week holds every state", () => {
  beforeEach(() => seedAt(NOW));

  it("D2 shows each status, each week state, and both approval flags", async () => {
    const items = await teamOf(WEEK);
    const states = Object.fromEntries(items.map((i) => [i.user.name, i.state]));
    expect(states).toMatchObject({
      "Sanduni B.": "approved",
      "Imali J.": "approved",
      "Nadia F.": "submitted",
      "Ruwan P.": "submitted",
      "Tharindu S.": "needs_correction",
      "Ayesha C.": "draft",
      "Dinesh K.": "on_leave",
      "Malith W.": "not_started",
    });
    const flag = (name) => byName(items, name).approvalRequested;
    expect([flag("Imali J."), flag("Sanduni B.")]).toEqual([true, false]);
    expect([flag("Nadia F."), flag("Ruwan P.")]).toEqual([true, false]);
    // The removed person is not on the team this week; the re-hired one is.
    expect(byName(items, "Chamari L.")).toBeUndefined();
    expect(byName(items, "Lakmal H.").state).toBe("draft");
    expect(byName(items, "Malith W.").report).toBeNull();
    expect(byName(items, "Dinesh K.").report).toBeNull();
    expect(byName(items, "Ayesha C.").report.tasksDone).toBeNull();
  });

  it("has a holiday in the week, so every filer's Wednesday is not expected", async () => {
    const holiday = await Holiday.findOne({
      name: "Full Moon Poya Day",
    }).lean();
    expect(holiday.date.toISOString()).toBe("2026-09-30T00:00:00.000Z");
    const items = await teamOf(WEEK);
    expect(byName(items, "Nadia F.").dayStates.wed).toBe("holiday");
    expect(byName(items, "Nadia F.").postedWeekdays).toEqual([
      "mon",
      "tue",
      "thu",
      "fri",
    ]);
  });

  it("D1 reads it: filed, not filed, leave, correction and blockers", async () => {
    const { data } = (await get(nadia, `summary?weekKey=${WEEK}`)).body;
    expect(data).toMatchObject({
      filed: 5,
      expected: 8,
      notFiled: 3,
      onLeave: 1,
      compliance: 5 / 8,
      needsCorrection: { count: 1 },
    });
    expect(data.openBlockers.count).toBeGreaterThanOrEqual(2);
    expect(data.complianceTrailing.rate).not.toBeNull();
  });

  it("has a Holiday week in the history, and a leave week and a not-started week before", async () => {
    const holidayWeek = shiftWeek(WEEK, -6);
    expect(new Set((await teamOf(holidayWeek)).map((i) => i.state))).toEqual(
      new Set(["holiday_week"]),
    );
    const leaveWeek = shiftWeek(WEEK, -3);
    const items = await teamOf(leaveWeek);
    expect(byName(items, "Dinesh K.").state).toBe("on_leave");
    expect(byName(items, "Malith W.").state).toBe("not_started");
    expect(byName(items, "Chamari L.")).toBeUndefined(); // removed during that week
    expect(byName(items, "Lakmal H.")).toBeUndefined(); // in the gap between his periods
    const gone = await get(nadia, `summary?weekKey=${leaveWeek}`);
    expect(gone.body.data.onLeave).toBe(1);
  });

  it("a person's history list carries every derived state, from the API alone", async () => {
    const dinesh = await User.findOne({ name: "Dinesh K." }).lean();
    const res = await api
      .get(`/api/users/${dinesh._id}/reports?limit=100`)
      .set({ Authorization: bearer(nadia) });
    expect(res.status).toBe(200);
    const statuses = res.body.data.items.map((i) => i.status);
    expect(statuses).toContain("on_leave");
    expect(statuses).toContain("approved");
  });
});

describe("the correction cycle, comments and approvals", () => {
  beforeEach(() => seedAt(NOW));

  it("has one complete cycle: three revisions, the send-back comment on a specific one", async () => {
    const ayesha = await User.findOne({ name: "Ayesha C." }).lean();
    const report = await Report.findOne({
      author: ayesha._id,
      weekKey: shiftWeek(WEEK, -1),
    }).lean();
    expect(report).toMatchObject({
      status: "approved",
      revisionNumber: 3,
      latestComment: null,
    });
    const revisions = await Revision.find({ report: report._id })
      .sort({ revisionNumber: 1 })
      .lean();
    expect(revisions.map((r) => r.action)).toEqual([
      "changes_requested",
      "changes_requested",
      "approved",
    ]);
    expect(revisions[0].comment).toMatch(/Wednesday/);
    expect(revisions[0].reviewedBy).not.toEqual(revisions[1].reviewedBy);
    // The first filing survives the corrections.
    expect(revisions[0].content.notes).not.toBe(revisions[2].content.notes);
    expect(report.weekComments.map((t) => [t.kind, t.revisionNumber])).toEqual([
      ["send_back", 1],
      ["send_back", 2],
    ]);
    expect(report.weekComments[0].replies).toHaveLength(1);
  });

  it("has an approval with a comment and a reply, and a send-back awaiting correction", async () => {
    const report = await Report.findOne({
      author: imali._id,
      weekKey: WEEK,
    }).lean();
    expect(report.status).toBe("approved");
    expect(report.weekComments).toHaveLength(1);
    expect(report.weekComments[0]).toMatchObject({
      kind: "approval",
      revisionNumber: 1,
    });
    expect(report.weekComments[0].replies).toHaveLength(1);
    const tharindu = await User.findOne({ name: "Tharindu S." }).lean();
    const sentBack = await Report.findOne({
      author: tharindu._id,
      weekKey: WEEK,
    }).lean();
    expect(sentBack.status).toBe("needs_correction");
    expect(sentBack.latestComment.text.length).toBeGreaterThanOrEqual(10);
    // The live correction differs from the revision managers read.
    const revision = await Revision.findOne({ report: sentBack._id }).lean();
    expect(revision.content.notes).not.toBe(sentBack.content.notes);
  });

  it("has a day open to the team with a teammate's comment and a reply", async () => {
    const report = await Report.findOne({
      author: imali._id,
      weekKey: WEEK,
    }).lean();
    const day = report.days.find((d) => d.openToTeam);
    expect(day.weekday).toBe("tue");
    expect(day.comments).toHaveLength(1);
    expect(String(day.comments[0].author)).not.toBe(String(imali._id));
    expect(day.comments[0].replies).toHaveLength(1);
  });

  it("has blockers, one resolved, and a carried-over one", async () => {
    const tharindu = await User.findOne({ name: "Tharindu S." }).lean();
    const now = await Report.findOne({
      author: tharindu._id,
      weekKey: WEEK,
    }).lean();
    const before = await Report.findOne({
      author: tharindu._id,
      weekKey: shiftWeek(WEEK, -1),
    }).lean();
    const text = (r) => r.days.flatMap((d) => d.blockers.map((b) => b.text));
    expect(text(now)[0]).toBe(text(before)[0]);
    const withResolution = await Report.find({
      "blockerResolutions.0": { $exists: true },
    }).lean();
    expect(withResolution.length).toBeGreaterThanOrEqual(1);
  });

  it("the team reads a teammate's open day with its comment, never a draft's content", async () => {
    const ayesha = await User.findOne({ name: "Ayesha C." }).lean();
    const res = await api
      .get(`/api/updates?weekKey=${WEEK}&weekday=tue`)
      .set({ Authorization: bearer(ayesha) });
    expect(res.status).toBe(200);
    const entry = res.body.data.items.find((i) => i.user.name === "Imali J.");
    expect(entry.day.comments).toHaveLength(1);
    expect(entry.day.comments[0].replies).toHaveLength(1);
    expect(entry.day.canComment).toBe(true);
    expect(JSON.stringify(res.body)).not.toMatch(/achievements|nextWeek/);
  });
});

describe("tasks, projects, holidays, markers", () => {
  beforeEach(() => seedAt(NOW));

  it("has small tasks and long ones, some done and some open", async () => {
    const tasks = await Task.find().lean();
    expect(tasks.some((t) => t.doneAt)).toBe(true);
    expect(tasks.some((t) => !t.doneAt)).toBe(true);
    const weeksOf = new Map();
    for (const r of await Report.find()
      .select("days.lines.task weekKey")
      .lean())
      for (const d of r.days)
        for (const l of d.lines) {
          const set = weeksOf.get(String(l.task)) ?? new Set();
          set.add(r.weekKey);
          weeksOf.set(String(l.task), set);
        }
    const spans = [...weeksOf.values()].map((s) => s.size);
    expect(spans.some((n) => n === 1)).toBe(true);
    expect(spans.some((n) => n >= 3)).toBe(true);
    // Every line names a task that exists, in the project the task has.
    const byId = new Map(tasks.map((t) => [String(t._id), t]));
    for (const r of await Report.find().lean())
      for (const d of r.days)
        for (const l of d.lines)
          expect(String(byId.get(String(l.task)).project)).toBe(
            String(l.project),
          );
  });

  it("covers every plan case, an inactive project, and D8 skips the inactive one", async () => {
    const { data } = (await get(nadia, `projects?weekKey=${WEEK}`)).body;
    const named = Object.fromEntries(
      data.items.map((i) => [i.project.name, i.progress]),
    );
    expect(Object.keys(named).sort()).toEqual([
      "Client A",
      "Internal Tooling",
      "Marketing",
      "R&D",
    ]);
    expect(named["Client A"]).toMatchObject({ overdueDays: 0 });
    expect(named["Client A"].daysLeft).toBeGreaterThan(0);
    expect(named["Client A"].plan.plannedHours).not.toBeNull(); // planned hours
    expect(named["R&D"].overdueDays).toBeGreaterThan(0); // overdue
    expect(named["Marketing"]).toMatchObject({ daysUsed: 0, daysLeft: 10 }); // future start
    expect(named["Marketing"].plan.startDate > "2026-10-01").toBe(true);
    expect(named["Internal Tooling"].planHistory).toHaveLength(1); // extended
    const inactive = await Project.findOne({ status: "inactive" }).lean();
    expect(inactive.name).toBe("Legacy Portal");
    expect(
      await Task.countDocuments({ project: inactive._id }),
    ).toBeGreaterThan(0);
  });

  it("has holidays across the range, one in the current week", async () => {
    expect(await Holiday.countDocuments()).toBe(8);
  });

  it("has seen marks, and the new markers differ between people", async () => {
    const newFor = async (user) =>
      (await api.get("/api/me/new").set({ Authorization: bearer(user) })).body
        .data;
    expect((await newFor(imali)).nav.thisWeek).toBe(true); // an approval she has not seen
    const ruwan = await User.findOne({ email: "ruwan@example.com" }).lean();
    expect((await newFor(ruwan)).reviewRequests).toBeGreaterThanOrEqual(1);
  });

  it("every report's revisions match its revision number, and every submitted task has a status", async () => {
    for (const r of await Report.find().lean()) {
      const revisions = await Revision.countDocuments({ report: r._id });
      expect(revisions, `${r.weekKey} ${r.status}`).toBe(r.revisionNumber);
      if (r.status === "submitted" || r.status === "approved")
        for (const t of r.content.tasks) expect(t.status).not.toBeNull();
    }
  });
});

describe("relative to the week it runs in", () => {
  it("reseeding across a year boundary still fills the current week", async () => {
    const result = await seedAt(new Date("2027-01-06T12:00:00.000Z"));
    expect(result.currentWeek).toBe("2027-W01");
    const items = await teamOf("2027-W01");
    expect(new Set(items.map((i) => i.state))).toEqual(
      new Set([
        "approved",
        "submitted",
        "needs_correction",
        "draft",
        "on_leave",
        "not_started",
      ]),
    );
    expect(await Holiday.countDocuments()).toBe(8);
  });
});
