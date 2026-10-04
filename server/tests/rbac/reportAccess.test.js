import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Holiday } from "../../src/models/holidayModel.js";
import { Project } from "../../src/models/projectModel.js";
import { Report } from "../../src/models/reportModel.js";
import { Revision } from "../../src/models/revisionModel.js";
import { SeenMark } from "../../src/models/seenMarkModel.js";
import { Task } from "../../src/models/taskModel.js";
import { createUser } from "../helpers/testAuth.js";
import { clearDb } from "../helpers/testDb.js";
import {
  DAYS,
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
  submit,
} from "../helpers/testWeeks.js";

// api_specification.md §6.4 (19–25), the S4 done list (MASTER_PROMPT.md), and the reads:
// R1, R2, R4, R8, R9, R10, R13, U7, U8.

const ghost = "0123456789abcdef01234567";

let admin, managerA, managerB, memberX, memberY, project;

beforeEach(async () => {
  await clearDb();
  freezeAt("2026-10-02T12:00:00"); // Friday of 2026-W40
  admin = await createUser({ name: "Admin D.", role: "admin" });
  managerA = await createUser({ name: "Manager A.", role: "manager" });
  managerB = await createUser({ name: "Manager B.", role: "manager" });
  memberX = await createUser({ name: "Member X.", role: "member" });
  memberY = await createUser({ name: "Member Y.", role: "member" });
  project = await Project.create({ name: "Client A" });
});

afterEach(() => {
  vi.useRealTimers();
});

const getReport = (user, id) => api.get(`/api/reports/${id}`).set(as(user));

describe("S4 done list", () => {
  it("a member posts five days, sets statuses, submits", async () => {
    const view = await postWeek(memberX, project);
    expect(view.dayStates).toEqual(
      Object.fromEntries(DAYS.map((d) => [d, "posted"])),
    );
    expect(view.report.canSubmit).toBe(false);
    expect(view.report.submitBlockers).toEqual(["One task has no status."]);

    const taskId = view.report.tasks[0].task._id;
    let res = await autosave(memberX, view.report._id, {
      tasks: [{ task: taskId, status: "done", note: "Shipped" }],
      nextWeek: ["Start the login work", ""],
      achievements: [{ text: "Checkout live", isKey: true }],
      notes: "A good week",
      links: [{ label: "PR", url: "https://example.com/pr/1" }],
    });
    expect(res.status).toBe(200);
    expect(res.body.data.report).toMatchObject({
      canSubmit: true,
      submitBlockers: [],
      content: {
        nextWeek: ["Start the login work"],
        achievements: [{ text: "Checkout live", isKey: true }],
        notes: "A good week",
        links: [{ label: "PR", url: "https://example.com/pr/1" }],
      },
    });
    expect(res.body.data.report.lastActivityAt).toBeNull();

    res = await submit(memberX, view.report._id, true);
    expect(res.status).toBe(200);
    expect(res.body.data.state).toBe("submitted");
    expect(res.body.data.report).toMatchObject({
      status: "submitted",
      approvalRequested: true,
      revisionNumber: 1,
      submittedAt: "2026-10-02T12:00:00.000Z",
      lastActivityAt: "2026-10-02T12:00:00.000Z",
      canSubmit: false,
      submitBlockers: [],
      latestComment: null,
    });
    const revisions = await Revision.find({ report: view.report._id }).lean();
    expect(revisions).toHaveLength(1);
    expect(revisions[0]).toMatchObject({
      revisionNumber: 1,
      approvalRequested: true,
      action: null,
    });
    expect(revisions[0].content.tasks[0]).toMatchObject({
      status: "done",
      note: "Shipped",
    });
    expect(revisions[0].days).toHaveLength(5);
    expect(revisions[0].days[0]).not.toHaveProperty("comments");
    expect((await Task.findById(taskId).lean()).doneAt).toEqual(
      new Date("2026-10-02T12:00:00Z"),
    );
  });

  it("a teammate reads the days but gets content: null", async () => {
    const view = await filedWeek(memberX, project, { note: "Private note" });
    for (const res of [
      await getReport(memberY, view.report._id),
      await api
        .get(`/api/users/${memberX._id}/reports/${WEEK}`)
        .set(as(memberY)),
    ]) {
      expect(res.status).toBe(200);
      expect(res.body.data.report.days).toHaveLength(5);
      expect(res.body.data.report).toMatchObject({
        content: null,
        contentSource: "withheld",
        contentRevisionNumber: null,
        weekComments: null,
        canSubmit: null,
        submitBlockers: null,
      });
      expect(res.body.data.report.tasks[0]).toMatchObject({
        hours: 20,
        status: null,
        note: null,
      });
      expect(JSON.stringify(res.body)).not.toContain("Private note");
    }
  });

  it("a manager reading a Draft gets the days only", async () => {
    const view = await postWeek(memberX, project, ["mon", "tue"]);
    await autosave(memberX, view.report._id, { notes: "Draft notes" });
    const res = await getReport(managerA, view.report._id);
    expect(res.status).toBe(200);
    expect(res.body.data.state).toBe("draft");
    expect(res.body.data.report.days).toHaveLength(2);
    expect(res.body.data.report).toMatchObject({
      content: null,
      contentSource: "withheld",
      weekComments: null,
    });
    expect(JSON.stringify(res.body)).not.toContain("Draft notes");
  });

  it("a manager reading needs_correction gets the sent-back revision", async () => {
    const view = await filedWeek(memberX, project, { note: "First version" });
    await sendBack(view.report._id, managerA);
    // The author corrects: the live content changes.
    const taskId = view.report.tasks[0].task._id;
    await autosave(memberX, view.report._id, {
      tasks: [{ task: taskId, status: "in_progress", note: "Corrected" }],
      notes: "Corrected notes",
    });

    let res = await getReport(managerB, view.report._id);
    expect(res.body.data.report).toMatchObject({
      status: "needs_correction",
      contentSource: "revision",
      contentRevisionNumber: 1,
      content: { notes: "Week notes" },
      latestComment: {
        text: "Hours by type look off.",
        author: { _id: String(managerA._id) },
        revisionNumber: 1,
      },
    });
    expect(res.body.data.report.tasks[0]).toMatchObject({
      status: "done",
      note: "First version",
    });
    expect(res.body.data.report.weekComments[0]).toMatchObject({
      kind: "send_back",
      revisionNumber: 1,
    });
    expect(JSON.stringify(res.body)).not.toContain("Corrected");

    res = await getReport(memberX, view.report._id);
    expect(res.body.data.report).toMatchObject({
      contentSource: "live",
      contentRevisionNumber: null,
      content: { notes: "Corrected notes" },
      canSubmit: true,
    });
  });
});

describe("19 · member Y on X's report", () => {
  it("R6 or R7 → 403 REPORT_FORBIDDEN; R4 → 200 with days only", async () => {
    const view = await postWeek(memberX, project);
    let res = await autosave(memberY, view.report._id, { notes: "Hijack" });
    expect(res.status).toBe(403);
    expect(res.body.error).toEqual({ code: "REPORT_FORBIDDEN" });
    res = await submit(memberY, view.report._id);
    expect(res.status).toBe(403);
    expect(res.body.error).toEqual({ code: "REPORT_FORBIDDEN" });
    // A manager may not write the author's content either.
    res = await autosave(managerA, view.report._id, { notes: "Hijack" });
    expect(res.body.error).toEqual({ code: "REPORT_FORBIDDEN" });

    res = await getReport(memberY, view.report._id);
    expect(res.status).toBe(200);
    expect(res.body.data.report.days).toHaveLength(5);
    expect(res.body.data.report.content).toBeNull();
    expect((await Report.findById(view.report._id).lean()).content.notes).toBe(
      "",
    );
  });
});

describe("20 · ids", () => {
  it("a fabricated ObjectId → 404; not-an-id → 422", async () => {
    let res = await getReport(memberX, ghost);
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({ code: "REPORT_NOT_FOUND" });
    res = await getReport(memberX, "not-an-id");
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    for (const path of [
      `/api/reports/${ghost}/revisions`,
      `/api/reports/${ghost}/revisions/1`,
    ]) {
      res = await api.get(path).set(as(managerA));
      expect(res.body.error).toEqual({ code: "REPORT_NOT_FOUND" });
    }
    res = await autosave(memberX, ghost, {});
    expect(res.status).toBe(404);
    res = await api.get(`/api/users/${ghost}/reports/${WEEK}`).set(as(memberX));
    expect(res.body.error).toEqual({ code: "USER_NOT_FOUND" });
    res = await api
      .get(`/api/users/${memberX._id}/reports/2026-W99`)
      .set(as(memberX));
    expect(res.status).toBe(422);
  });
});

describe("21 · manager A → R4 on Y's Draft", () => {
  it("→ 200, contentSource withheld", async () => {
    const view = await postWeek(memberY, project, ["mon"]);
    const res = await getReport(managerA, view.report._id);
    expect(res.status).toBe(200);
    expect(res.body.data.report.contentSource).toBe("withheld");
  });
});

describe("22 · Y's needs_correction report", () => {
  it("manager A → contentSource revision; Y → live", async () => {
    const view = await filedWeek(memberY, project);
    await sendBack(view.report._id, managerB);
    expect(
      (await getReport(managerA, view.report._id)).body.data.report
        .contentSource,
    ).toBe("revision");
    expect(
      (await getReport(memberY, view.report._id)).body.data.report
        .contentSource,
    ).toBe("live");
  });
});

describe("23 · submit rules", () => {
  it("a missing expected day → 422 with fields['days.thu']; a holiday that day → 200", async () => {
    const view = await postWeek(memberX, project, ["mon", "tue", "wed", "fri"]);
    const taskId = view.report.tasks[0].task._id;
    await autosave(memberX, view.report._id, {
      tasks: [{ task: taskId, status: "done" }],
    });
    let res = await submit(memberX, view.report._id);
    expect(res.status).toBe(422);
    expect(res.body.error).toEqual({
      code: "VALIDATION_FAILED",
      fields: { "days.thu": "Thursday has no update." },
    });
    expect(await Revision.countDocuments()).toBe(0);

    await Holiday.create({
      date: new Date("2026-10-01T00:00:00Z"),
      name: "Poya",
      createdBy: admin._id,
    });
    res = await submit(memberX, view.report._id);
    expect(res.status).toBe(200);
    expect(res.body.data.expectedDays).toEqual(["mon", "tue", "wed", "fri"]);
    expect(res.body.data.dayStates.thu).toBe("holiday");
  });

  it("a task without a status → fields['tasks.<id>.status']", async () => {
    const view = await postWeek(memberX, project);
    const taskId = view.report.tasks[0].task._id;
    const res = await submit(memberX, view.report._id);
    expect(res.status).toBe(422);
    expect(res.body.error.fields).toEqual({
      [`tasks.${taskId}.status`]: "Choose a status.",
    });
  });

  it("R7 on a submitted report → 409; a needs_correction report resubmits as revision 2", async () => {
    const view = await filedWeek(memberX, project);
    let res = await submit(memberX, view.report._id);
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({
      code: "REPORT_STATE_CHANGED",
      status: "submitted",
    });
    res = await autosave(memberX, view.report._id, { notes: "Too late" });
    expect(res.body.error).toEqual({
      code: "REPORT_STATE_CHANGED",
      status: "submitted",
    });

    await sendBack(view.report._id, managerA);
    res = await submit(memberX, view.report._id);
    expect(res.status).toBe(200);
    expect(res.body.data.report).toMatchObject({
      status: "submitted",
      revisionNumber: 2,
      latestComment: null,
    });
    expect(await Revision.countDocuments({ report: view.report._id })).toBe(2);
  });
});

describe("24 · two concurrent submits", () => {
  it("→ exactly one 200 and one 409; exactly one revision", async () => {
    const view = await postWeek(memberX, project);
    await autosave(memberX, view.report._id, {
      tasks: [{ task: view.report.tasks[0].task._id, status: "done" }],
    });
    const results = await Promise.all([
      submit(memberX, view.report._id),
      submit(memberX, view.report._id),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(results.find((r) => r.status === 409).body.error).toEqual({
      code: "REPORT_STATE_CHANGED",
      status: "submitted",
    });
    expect(await Revision.countDocuments({ report: view.report._id })).toBe(1);
    expect((await Report.findById(view.report._id).lean()).revisionNumber).toBe(
      1,
    );
  });
});

describe("25 · resolving a blocker", () => {
  async function weekWithBlocker(status) {
    let res = await putDay(
      memberX,
      "mon",
      dayBody({ project, blockers: [{ text: "Keys" }] }),
    );
    let view = res.body.data;
    if (status !== "draft") {
      view = await postWeek(
        memberX,
        view.report.days[0].lines[0].task.project._id,
        ["tue", "wed", "thu", "fri"],
      );
      await autosave(memberX, view.report._id, {
        tasks: view.report.tasks.map((t) => ({
          task: t.task._id,
          status: "done",
        })),
      });
      expect((await submit(memberX, view.report._id)).status).toBe(200);
      await Report.updateOne({ _id: view.report._id }, { $set: { status } });
    }
    return {
      reportId: view.report._id,
      blockerId: view.report.days[0].blockers[0]._id,
    };
  }

  it.each(["draft", "approved"])(
    "on a %s report: author and manager → 200; teammate → 403",
    async (status) => {
      const { reportId, blockerId } = await weekWithBlocker(status);
      const url = `/api/reports/${reportId}/blockers/${blockerId}/resolution`;
      for (const who of [memberX, managerA]) {
        let res = await api.put(url).set(as(who));
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({
          blockerId,
          resolvedAt: "2026-10-02T12:00:00.000Z",
          resolvedBy: { _id: String(memberX._id) }, // the first resolution stands
        });
        if (who === managerA) {
          res = await api.delete(url).set(as(who));
          expect(res.body.data).toEqual({
            blockerId,
            resolvedAt: null,
            resolvedBy: null,
          });
          res = await api.delete(url).set(as(who));
          expect(res.status).toBe(200);
        }
      }
      const res = await api.put(url).set(as(memberY));
      expect(res.status).toBe(403);
      expect(res.body.error).toEqual({ code: "REPORT_FORBIDDEN" });
      expect(
        (await Report.findById(reportId).lean()).blockerResolutions,
      ).toEqual([]);
      // Resolving touches neither the status nor any revision.
      expect((await Report.findById(reportId).lean()).status).toBe(status);
    },
  );

  it("a blocker not in any day → 404 BLOCKER_NOT_FOUND", async () => {
    const { reportId } = await weekWithBlocker("draft");
    const res = await api
      .put(`/api/reports/${reportId}/blockers/${ghost}/resolution`)
      .set(as(memberX));
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({ code: "BLOCKER_NOT_FOUND" });
  });
});

describe("R6 — autosave", () => {
  it("only sets status and note on tasks already listed", async () => {
    const view = await postWeek(memberX, project, ["mon"]);
    let res = await autosave(memberX, view.report._id, {
      tasks: [{ task: ghost, status: "done" }],
    });
    expect(res.status).toBe(422);
    expect(res.body.error.fields).toEqual({
      "tasks.0.task": "That task isn't in this week.",
    });
    res = await autosave(memberX, view.report._id, {
      achievements: [
        { text: "A", isKey: true },
        { text: "B", isKey: true },
      ],
    });
    expect(res.status).toBe(422);
    res = await autosave(memberX, view.report._id, {
      links: [{ label: "x", url: "ftp://example.com" }],
    });
    expect(res.body.error.fields).toHaveProperty(["links.0.url"]);
  });

  it("partial updates keep what they don't name", async () => {
    const view = await postWeek(memberX, project, ["mon"]);
    const task = view.report.tasks[0].task._id;
    await autosave(memberX, view.report._id, {
      tasks: [{ task, status: "in_progress", note: "Kept" }],
      notes: "Kept notes",
    });
    const res = await autosave(memberX, view.report._id, {
      tasks: [{ task, status: "done" }],
    });
    expect(res.body.data.report.tasks[0]).toMatchObject({
      status: "done",
      note: "Kept",
    });
    expect(res.body.data.report.content.notes).toBe("Kept notes");
  });
});

describe("R8, R9 — revisions", () => {
  it("the author and managers once submitted; a teammate → 403", async () => {
    const view = await filedWeek(memberX, project);
    await sendBack(view.report._id, managerA);
    await submit(memberX, view.report._id);

    let res = await api
      .get(`/api/reports/${view.report._id}/revisions`)
      .set(as(managerB));
    expect(res.status).toBe(200);
    expect(
      res.body.data.items.map((r) => [r.revisionNumber, r.isCurrent, r.action]),
    ).toEqual([
      [2, true, null],
      [1, false, "changes_requested"],
    ]);
    expect(res.body.data.items[1]).toMatchObject({
      comment: "Hours by type look off.",
      reviewedBy: { _id: String(managerA._id), name: "Manager A." },
      submittedBy: { _id: String(memberX._id) },
    });

    res = await api
      .get(`/api/reports/${view.report._id}/revisions/1`)
      .set(as(memberX));
    expect(res.status).toBe(200);
    expect(res.body.data.content.tasks[0]).toMatchObject({
      task: { name: "Checkout redesign" },
      status: "done",
    });
    expect(res.body.data.days).toHaveLength(5);
    expect(res.body.data.days[0]).not.toHaveProperty("comments");
    expect(res.body.data.days[0].blockers).toEqual([]);

    res = await api
      .get(`/api/reports/${view.report._id}/revisions/3`)
      .set(as(memberX));
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({ code: "REVISION_NOT_FOUND" });

    res = await api
      .get(`/api/reports/${view.report._id}/revisions`)
      .set(as(memberY));
    expect(res.status).toBe(403);
    expect(res.body.error).toEqual({ code: "REPORT_FORBIDDEN" });
  });

  it("a manager on a Draft → 403", async () => {
    const view = await postWeek(memberX, project, ["mon"]);
    const res = await api
      .get(`/api/reports/${view.report._id}/revisions`)
      .set(as(managerA));
    expect(res.status).toBe(403);
  });
});

describe("R3 — my week", () => {
  it("serves Not started with holidays and leave already marked", async () => {
    await Holiday.create({
      date: new Date("2026-09-29T00:00:00Z"),
      name: "Poya",
      createdBy: admin._id,
    });
    const res = await api.get(`/api/reports/week/${WEEK}`).set(as(memberX));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      user: {
        _id: String(memberX._id),
        name: "Member X.",
        role: "member",
        status: "active",
        onLeave: false,
      },
      weekKey: WEEK,
      weekStart: "2026-09-28",
      weekEnd: "2026-10-02",
      expectedDays: ["mon", "wed", "thu", "fri"],
      dayStates: {
        mon: "missing",
        tue: "holiday",
        wed: "missing",
        thu: "missing",
        fri: "today",
      },
      state: "not_started",
      report: null,
    });
  });
});

describe("R1, R2 — my reports and the personal strip", () => {
  it("R1 lists only the actor's reports, filtered, sorted and paged", async () => {
    await filedWeek(memberX, project);
    await putDay(memberX, "mon", dayBody({ project }), "2026-W39");
    await postWeek(memberY, project, ["mon"]);

    let res = await api.get("/api/reports").set(as(memberX));
    expect(res.status).toBe(200);
    expect(res.body.data.meta).toEqual({
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
    });
    expect(res.body.data.items.map((r) => [r.weekKey, r.status])).toEqual([
      ["2026-W40", "submitted"],
      ["2026-W39", "draft"],
    ]);
    expect(res.body.data.items[0]).toMatchObject({
      projects: [
        { _id: String(project._id), name: "Client A", status: "active" },
      ],
      tasksDone: 1,
      taskCount: 1,
      hours: 20,
      revisionNumber: 1,
      postedWeekdays: DAYS,
      isNew: false,
    });

    res = await api.get("/api/reports?status=draft&dir=asc").set(as(memberX));
    expect(res.body.data.items.map((r) => r.weekKey)).toEqual(["2026-W39"]);
    res = await api
      .get("/api/reports?weekFrom=2026-W40&weekTo=2026-W40")
      .set(as(memberX));
    expect(res.body.data.items.map((r) => r.weekKey)).toEqual(["2026-W40"]);
    res = await api.get(`/api/reports?project=${ghost}`).set(as(memberX));
    expect(res.body.data.items).toEqual([]);
    res = await api
      .get("/api/reports?weekFrom=2026-W40&weekTo=2026-W39")
      .set(as(memberX));
    expect(res.status).toBe(422);
    res = await api.get("/api/reports?sort=hours").set(as(memberX));
    expect(res.status).toBe(422);
  });

  it("R2 counts filed weeks, hours dated in the month, open blockers of the week", async () => {
    // W40 runs 28 Sep – 2 Oct: three days in September, two in October; 4 hours a day.
    const view = await filedWeek(memberX, project);
    const res1 = await putDay(
      memberX,
      "mon",
      dayBody({ project, blockers: [{ text: "A" }, { text: "B" }] }),
      "2026-W39",
    );
    const w39 = res1.body.data.report;
    await api
      .put(
        `/api/reports/${w39._id}/blockers/${w39.days[0].blockers[0]._id}/resolution`,
      )
      .set(as(memberX));
    expect(view.report.status).toBe("submitted");

    let res = await api
      .get("/api/reports/summary?weekKey=2026-W39&month=2026-09")
      .set(as(memberX));
    expect(res.body.data).toEqual({
      weeksFiled: 1,
      hoursThisMonth: 16,
      openBlockers: 1,
    });
    res = await api
      .get("/api/reports/summary?weekKey=2026-W40&month=2026-10")
      .set(as(memberX));
    expect(res.body.data).toEqual({
      weeksFiled: 1,
      hoursThisMonth: 8,
      openBlockers: 0,
    });
    res = await api
      .get("/api/reports/summary?weekKey=2026-W40")
      .set(as(memberX));
    expect(res.status).toBe(422);
  });
});

describe("U7 — someone's history", () => {
  it("every week on the team, with WeekRows for weeks without a report", async () => {
    const joiner = await createUser({
      name: "Joiner J.",
      workPeriods: [{ from: new Date("2026-09-16T09:00:00Z"), to: null }], // Wed of W38
      leave: [
        {
          from: new Date("2026-09-21T00:00:00Z"),
          to: new Date("2026-09-28T00:00:00Z"),
          setBy: managerA._id,
        },
      ],
    });
    await postWeek(joiner, project, ["mon", "tue"]);

    let res = await api
      .get(`/api/users/${joiner._id}/reports`)
      .set(as(managerA));
    expect(res.status).toBe(200);
    expect(res.body.data.meta.total).toBe(3);
    expect(
      res.body.data.items.map((r) => [r.weekKey, r.status, r._id === null]),
    ).toEqual([
      ["2026-W40", "draft", false],
      ["2026-W39", "on_leave", true],
      ["2026-W38", "not_started", true],
    ]);
    expect(res.body.data.items[0].tasksDone).toBeNull(); // a Draft, read by a manager
    expect(res.body.data.items[2]).toEqual({
      _id: null,
      weekKey: "2026-W38",
      weekStart: "2026-09-14",
      weekEnd: "2026-09-18",
      status: "not_started",
      hours: null,
      projects: [],
      taskCount: null,
      tasksDone: null,
      revisionNumber: 0,
      lastActivityAt: null,
      isNew: false,
    });

    res = await api
      .get(`/api/users/${joiner._id}/reports?status=on_leave,draft&dir=asc`)
      .set(as(admin));
    expect(res.body.data.items.map((r) => r.weekKey)).toEqual([
      "2026-W39",
      "2026-W40",
    ]);

    res = await api
      .get(`/api/users/${joiner._id}/reports?sort=lastActivityAt`)
      .set(as(admin));
    expect(res.body.data.items.map((r) => r.weekKey)).toEqual([
      "2026-W40",
      "2026-W39",
      "2026-W38",
    ]);

    await Holiday.insertMany(
      [
        "2026-09-14",
        "2026-09-15",
        "2026-09-16",
        "2026-09-17",
        "2026-09-18",
      ].map((d) => ({
        date: new Date(`${d}T00:00:00Z`),
        name: "Festival",
        createdBy: admin._id,
      })),
    );
    res = await api
      .get(`/api/users/${joiner._id}/reports?weekTo=2026-W38`)
      .set(as(admin));
    expect(res.body.data.items.map((r) => r.status)).toEqual(["holiday_week"]);

    res = await api.get(`/api/users/${ghost}/reports`).set(as(admin));
    expect(res.body.error).toEqual({ code: "USER_NOT_FOUND" });
  });

  it("filed rows: tasksDone from the content once submitted, from the revision on needs_correction", async () => {
    const view = await filedWeek(memberX, project);
    await sendBack(view.report._id, managerA);
    await autosave(memberX, view.report._id, {
      tasks: [{ task: view.report.tasks[0].task._id, status: "carried_over" }],
    });
    let res = await api
      .get(`/api/users/${memberX._id}/reports?limit=50`)
      .set(as(managerB));
    const row = res.body.data.items.find((r) => r.weekKey === WEEK);
    expect(row).toMatchObject({ status: "needs_correction", tasksDone: 1 });
    res = await api.get("/api/reports").set(as(memberX));
    expect(res.body.data.items[0]).toMatchObject({
      status: "needs_correction",
      tasksDone: 0,
    });
  });
});

describe("R13 — mark seen", () => {
  it("anyone who may open the week; upserts one mark", async () => {
    const view = await postWeek(memberX, project, ["mon"]);
    const url = `/api/reports/${view.report._id}/seen`;
    let res = await api.post(url).set(as(memberY));
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
    vi.setSystemTime(new Date("2026-10-02T13:00:00.000Z"));
    await Promise.all([
      api.post(url).set(as(memberY)),
      api.post(url).set(as(memberY)),
    ]);
    const marks = await SeenMark.find().lean();
    expect(marks).toHaveLength(1);
    expect(marks[0].seenAt).toEqual(new Date("2026-10-02T13:00:00.000Z"));
    res = await api.post(`/api/reports/${ghost}/seen`).set(as(memberY));
    expect(res.status).toBe(404);
  });
});
