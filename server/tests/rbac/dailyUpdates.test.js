import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Holiday } from "../../src/models/holidayModel.js";
import { Project } from "../../src/models/projectModel.js";
import { Report } from "../../src/models/reportModel.js";
import { Task } from "../../src/models/taskModel.js";
import { User } from "../../src/models/userModel.js";
import { createUser } from "../helpers/testAuth.js";
import { clearDb } from "../helpers/testDb.js";
import {
  WEEK,
  api,
  as,
  autosave,
  commentOnDay,
  dayBody,
  deleteComment,
  editComment,
  filedWeek,
  freezeAt,
  postWeek,
  putDay,
  reply,
  submit,
} from "../helpers/testWeeks.js";

// api_specification.md §6.3 — items 11–18 (15–17, day comments and the 10-minute window
// on an injected clock, shipped with S5). Also R5's details, R11, R12, and the C1–C5 rules
// for day threads.

let admin, managerA, memberX, memberY, project, inactive;

beforeEach(async () => {
  await clearDb();
  freezeAt("2026-10-02T12:00:00"); // Friday of 2026-W40
  admin = await createUser({ name: "Admin D.", role: "admin" });
  managerA = await createUser({ name: "Manager A.", role: "manager" });
  memberX = await createUser({ name: "Member X.", role: "member" });
  memberY = await createUser({ name: "Member Y.", role: "member" });
  project = await Project.create({ name: "Client A" });
  inactive = await Project.create({ name: "Old client", status: "inactive" });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("11 · the first daily update starts the week's report", () => {
  it("member X → R5 for today → 200, and the report exists as a Draft", async () => {
    expect(await Report.countDocuments()).toBe(0);
    const res = await putDay(memberX, "fri", dayBody({ project }));
    expect(res.status).toBe(200);
    const view = res.body.data;
    expect(view).toMatchObject({
      weekKey: WEEK,
      weekStart: "2026-09-28",
      weekEnd: "2026-10-02",
      expectedDays: ["mon", "tue", "wed", "thu", "fri"],
      state: "draft",
      dayStates: {
        mon: "missing",
        tue: "missing",
        wed: "missing",
        thu: "missing",
        fri: "posted",
      },
    });
    expect(view.report).toMatchObject({
      status: "draft",
      revisionNumber: 0,
      lastActivityAt: null,
      contentSource: "live",
      canSubmit: false,
      submitBlockers: [
        "Monday has no update.",
        "Tuesday has no update.",
        "Wednesday has no update.",
        "Thursday has no update.",
        "One task has no status.",
      ],
    });
    const [day] = view.report.days;
    expect(day).toMatchObject({
      weekday: "fri",
      openToTeam: false,
      editedAt: null,
      hours: 4,
      comments: [],
      canComment: true,
    });
    expect(day.lines[0].task).toMatchObject({
      name: "Checkout redesign",
      project: { _id: String(project._id), name: "Client A", status: "active" },
    });
    const stored = await Report.findOne({ author: memberX._id }).lean();
    expect(stored.status).toBe("draft");
    expect(stored.lastActivityAt).toBeUndefined();
    expect(stored.content.tasks).toEqual([
      { task: stored.days[0].lines[0].task, status: null, note: "" },
    ]);
    expect(String(stored.days[0].lines[0].project)).toBe(String(project._id));
    expect(await Task.countDocuments({ owner: memberX._id })).toBe(1);
  });

  it("two concurrent first posts make one report with both days", async () => {
    const [a, b] = await Promise.all([
      putDay(memberX, "mon", dayBody({ project })),
      putDay(memberX, "tue", dayBody({ project })),
    ]);
    expect([a.status, b.status]).toEqual([200, 200]);
    const reports = await Report.find({ author: memberX._id }).lean();
    expect(reports).toHaveLength(1);
    expect(reports[0].days.map((d) => d.weekday).sort()).toEqual([
      "mon",
      "tue",
    ]);
    expect(reports[0].content.tasks).toHaveLength(2);
  });
});

describe("12 · R5 on a day that isn't expected → 422 DAY_NOT_EXPECTED", () => {
  it("a future weekday → reason future; the UTC+14 bound allows the next day", async () => {
    freezeAt("2026-09-30T12:00:00"); // Wednesday; +14h is Thursday 02:00
    let res = await putDay(memberX, "fri", dayBody({ project }));
    expect(res.status).toBe(422);
    expect(res.body.error).toEqual({
      code: "DAY_NOT_EXPECTED",
      reason: "future",
    });
    res = await putDay(memberX, "thu", dayBody({ project }));
    expect(res.status).toBe(200);
    expect(res.body.data.dayStates).toMatchObject({
      wed: "today",
      thu: "posted",
      fri: "future",
      mon: "missing",
    });
  });

  it("a holiday → reason holiday", async () => {
    await Holiday.create({
      date: new Date("2026-09-30T00:00:00Z"),
      name: "Poya",
      createdBy: admin._id,
    });
    const res = await putDay(memberX, "wed", dayBody({ project }));
    expect(res.status).toBe(422);
    expect(res.body.error).toEqual({
      code: "DAY_NOT_EXPECTED",
      reason: "holiday",
    });
    expect(await Report.countDocuments()).toBe(0);
  });

  it("a leave day → reason leave", async () => {
    await User.updateOne(
      { _id: memberX._id },
      {
        $push: {
          leave: {
            from: new Date("2026-10-01T09:00:00Z"),
            to: null,
            setBy: memberX._id,
          },
        },
      },
    );
    let res = await putDay(memberX, "thu", dayBody({ project }));
    expect(res.status).toBe(422);
    expect(res.body.error).toEqual({
      code: "DAY_NOT_EXPECTED",
      reason: "leave",
    });
    res = await putDay(memberX, "wed", dayBody({ project }));
    expect(res.status).toBe(200);
    expect(res.body.data.expectedDays).toEqual(["mon", "tue", "wed"]);
    expect(res.body.data.dayStates).toMatchObject({
      thu: "leave",
      fri: "leave",
    });
  });

  it("a day before the person joined → reason not_on_team", async () => {
    const joiner = await createUser({
      workPeriods: [{ from: new Date("2026-09-30T08:00:00Z"), to: null }],
    });
    const res = await putDay(joiner, "tue", dayBody({ project }));
    expect(res.status).toBe(422);
    expect(res.body.error).toEqual({
      code: "DAY_NOT_EXPECTED",
      reason: "not_on_team",
    });
  });

  it("a week after the current one, or before the person's work periods → 422 WEEK_OUT_OF_RANGE", async () => {
    let res = await putDay(memberX, "mon", dayBody({ project }), "2026-W41");
    expect(res.status).toBe(422);
    expect(res.body.error).toEqual({ code: "WEEK_OUT_OF_RANGE" });
    res = await putDay(memberX, "mon", dayBody({ project }), "2025-W50");
    expect(res.body.error).toEqual({ code: "WEEK_OUT_OF_RANGE" });
    // An earlier week inside the work period is writable.
    res = await putDay(memberX, "mon", dayBody({ project }), "2026-W39");
    expect(res.status).toBe(200);
  });
});

describe("13 · tasks", () => {
  it("member Y's task id → 404 TASK_NOT_FOUND; nothing is written", async () => {
    const view = await postWeek(memberY, project, ["mon"]);
    const yTask = view.report.days[0].lines[0].task._id;
    const res = await putDay(memberX, "mon", dayBody({ task: yTask }));
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({ code: "TASK_NOT_FOUND" });
    expect(await Report.countDocuments({ author: memberX._id })).toBe(0);
  });

  it("a newTask on an inactive project → 422 PROJECT_INACTIVE", async () => {
    const res = await putDay(memberX, "mon", dayBody({ project: inactive }));
    expect(res.status).toBe(422);
    expect(res.body.error).toEqual({ code: "PROJECT_INACTIVE" });
    expect(await Task.countDocuments()).toBe(0);
  });

  it("an unknown project → 404 PROJECT_NOT_FOUND", async () => {
    const res = await putDay(
      memberX,
      "mon",
      dayBody({ project: "0123456789abcdef01234567" }),
    );
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({ code: "PROJECT_NOT_FOUND" });
  });

  it("a task closed since stays usable in a week that already names it", async () => {
    const view = await postWeek(memberX, project, ["mon"]);
    const taskId = view.report.days[0].lines[0].task._id;
    await Task.updateOne({ _id: taskId }, { $set: { doneAt: new Date() } });
    expect(
      (await putDay(memberX, "mon", dayBody({ task: taskId }))).status,
    ).toBe(200);
    // …but not in a week that doesn't.
    const res = await putDay(
      memberX,
      "mon",
      dayBody({ task: taskId }),
      "2026-W39",
    );
    expect(res.body.error).toEqual({ code: "TASK_NOT_FOUND" });
  });

  it("the lines' tasks drive content.tasks: added, kept with their status, dropped", async () => {
    let view = await postWeek(memberX, project, ["mon"]);
    const first = view.report.days[0].lines[0].task._id;
    await autosave(memberX, view.report._id, {
      tasks: [{ task: first, status: "in_progress", note: "Going" }],
    });
    // Tuesday names the first task and starts a second.
    let res = await putDay(memberX, "tue", {
      lines: [
        { task: first, taskType: "testing", text: "Tests", hours: 1.5 },
        {
          newTask: { name: "Login timeout", project: String(project._id) },
          taskType: "review",
          text: "Review",
          hours: 0.25,
        },
      ],
      blockers: [],
      openToTeam: false,
    });
    view = res.body.data;
    expect(
      view.report.tasks.map((t) => [t.task.name, t.hours, t.status, t.note]),
    ).toEqual([
      ["Checkout redesign", 5.5, "in_progress", "Going"],
      ["Login timeout", 0.25, null, ""],
    ]);
    expect(view.report.hoursByType).toEqual({
      development: 4,
      testing: 1.5,
      meetings: 0,
      documentation: 0,
      review: 0.25,
      research_study: 0,
      other: 0,
    });
    // Monday and Tuesday rewritten without the second task: its row goes.
    res = await putDay(memberX, "tue", dayBody({ task: first }));
    expect(res.body.data.report.tasks.map((t) => t.task.name)).toEqual([
      "Checkout redesign",
    ]);
  });
});

describe("R5 — editing a posted day", () => {
  it("round-trips ids, keeps postedAt and comments, sets editedAt", async () => {
    let res = await putDay(
      memberX,
      "mon",
      dayBody({ project, blockers: [{ text: "Waiting on API keys" }] }),
    );
    const posted = res.body.data.report.days[0];
    await Report.updateOne(
      { author: memberX._id },
      {
        $push: {
          "days.0.comments": {
            author: managerA._id,
            text: "Chased the keys.",
            createdAt: new Date(),
          },
        },
      },
    );
    vi.setSystemTime(new Date("2026-10-02T13:00:00.000Z"));
    res = await putDay(memberX, "mon", {
      lines: [
        {
          _id: posted.lines[0]._id,
          task: posted.lines[0].task._id,
          taskType: "other",
          text: "Edited",
          hours: 2,
        },
      ],
      blockers: [{ _id: posted.blockers[0]._id, text: "Still waiting" }],
      openToTeam: true,
    });
    expect(res.status).toBe(200);
    const day = res.body.data.report.days[0];
    expect(day.lines[0]._id).toBe(posted.lines[0]._id);
    expect(day.blockers[0]._id).toBe(posted.blockers[0]._id);
    expect(day.postedAt).toBe(posted.postedAt);
    expect(day.editedAt).toBe("2026-10-02T13:00:00.000Z");
    expect(day.openToTeam).toBe(true);
    expect(day.comments).toHaveLength(1);
    expect(day.comments[0]).toMatchObject({
      text: "Chased the keys.",
      author: { _id: String(managerA._id), name: "Manager A." },
      revisionNumber: null,
      kind: null,
      replies: [],
      isNew: true, // the author hasn't opened the week since the manager wrote
    });
  });

  it("a submitted week is frozen → 409 REPORT_STATE_CHANGED with its status", async () => {
    const view = await postWeek(memberX, project);
    await autosave(memberX, view.report._id, {
      tasks: [{ task: view.report.tasks[0].task._id, status: "done" }],
    });
    expect((await submit(memberX, view.report._id)).status).toBe(200);
    const before = await Task.countDocuments();
    const res = await putDay(memberX, "mon", dayBody({ project }));
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({
      code: "REPORT_STATE_CHANGED",
      status: "submitted",
    });
    expect(await Task.countDocuments()).toBe(before);
  });

  it("validates the whole day", async () => {
    let res = await putDay(memberX, "mon", {
      lines: [],
      blockers: [],
      openToTeam: false,
    });
    expect(res.status).toBe(422);
    expect(res.body.error.fields).toHaveProperty("lines");
    res = await putDay(memberX, "mon", {
      ...dayBody({ project }),
      lines: [{ ...dayBody({ project }).lines[0], hours: 1.1 }],
    });
    expect(res.body.error.fields).toHaveProperty(["lines.0.hours"]);
    res = await putDay(memberX, "sat", dayBody({ project }));
    expect(res.status).toBe(422);
  });
});

describe("14 · teammates read the days, never the content", () => {
  it("member Y → R12 sees X's day; U8 on X's week → days served, content null", async () => {
    const view = await postWeek(memberX, project, ["thu", "fri"]);
    await autosave(memberX, view.report._id, {
      tasks: [
        {
          task: view.report.tasks[0].task._id,
          status: "done",
          note: "Private",
        },
      ],
      notes: "Private notes",
    });

    let res = await api
      .get(`/api/updates?weekKey=${WEEK}&weekday=fri`)
      .set(as(memberY));
    expect(res.status).toBe(200);
    const items = res.body.data.items;
    // Viewer first, then by name.
    expect(items.map((i) => i.user.name)).toEqual([
      "Member Y.",
      "Admin D.",
      "Manager A.",
      "Member X.",
    ]);
    const x = items.find((i) => i.user._id === String(memberX._id));
    expect(x).toMatchObject({ state: "posted", reportId: view.report._id });
    expect(x.day.lines[0].text).toBe("Worked on it");
    expect(x.day.canComment).toBe(false);
    expect(items[0]).toMatchObject({
      state: "not_posted",
      reportId: null,
      day: null,
    });
    expect(JSON.stringify(res.body)).not.toContain("Private");

    res = await api
      .get(`/api/users/${memberX._id}/reports/${WEEK}`)
      .set(as(memberY));
    expect(res.status).toBe(200);
    expect(res.body.data.report.days).toHaveLength(2);
    expect(res.body.data.report).toMatchObject({
      content: null,
      contentSource: "withheld",
      weekComments: null,
      latestComment: null,
      canSubmit: null,
      submitBlockers: null,
    });
    expect(res.body.data.report.tasks[0]).toMatchObject({
      hours: 8,
      status: null,
      note: null,
    });
    expect(JSON.stringify(res.body)).not.toContain("Private");
  });

  it("R12 filters by project and blockers, and marks holidays and leave", async () => {
    const other = await Project.create({ name: "Client B" });
    await putDay(
      memberX,
      "fri",
      dayBody({ project, blockers: [{ text: "Keys" }] }),
    );
    await putDay(memberY, "fri", dayBody({ project: other }));
    await User.updateOne(
      { _id: managerA._id },
      {
        $push: {
          leave: {
            from: new Date("2026-09-01T00:00:00Z"),
            to: null,
            setBy: managerA._id,
          },
        },
      },
    );
    const feed = (q) =>
      api.get(`/api/updates?weekKey=${WEEK}&weekday=fri${q}`).set(as(admin));

    let res = await feed(`&project=${other._id}`);
    expect(res.body.data.items.map((i) => i.user.name)).toEqual(["Member Y."]);
    res = await feed("&blockersOnly=true");
    expect(res.body.data.items.map((i) => i.user.name)).toEqual(["Member X."]);
    res = await feed("");
    expect(res.body.data.items.map((i) => [i.user.name, i.state])).toEqual([
      ["Admin D.", "not_posted"],
      ["Manager A.", "leave"],
      ["Member X.", "posted"],
      ["Member Y.", "posted"],
    ]);

    await Holiday.create({
      date: new Date("2026-09-28T00:00:00Z"),
      name: "Poya",
      createdBy: admin._id,
    });
    res = await api
      .get(`/api/updates?weekKey=${WEEK}&weekday=mon`)
      .set(as(admin));
    // A holiday comes before leave, as in calendarService.dayAvailability.
    expect(res.body.data.items.map((i) => i.state)).toEqual([
      "holiday",
      "holiday",
      "holiday",
      "holiday",
    ]);
    res = await api.get(`/api/updates?weekKey=${WEEK}`).set(as(admin));
    expect(res.status).toBe(422);
  });
});

describe("18 · resolutions and the key blocker", () => {
  it("R5 dropping a blocker _id prunes its resolution", async () => {
    let res = await putDay(
      memberX,
      "mon",
      dayBody({ project, blockers: [{ text: "Keys" }, { text: "VPN" }] }),
    );
    const report = res.body.data.report;
    const [keys, vpn] = report.days[0].blockers;
    for (const b of [keys, vpn]) {
      res = await api
        .put(`/api/reports/${report._id}/blockers/${b._id}/resolution`)
        .set(as(memberX));
      expect(res.status).toBe(200);
    }
    res = await putDay(memberX, "mon", {
      ...dayBody({ task: report.days[0].lines[0].task._id }),
      blockers: [{ _id: keys._id, text: "Keys" }],
    });
    const stored = await Report.findById(report._id).lean();
    expect(stored.blockerResolutions.map((r) => String(r.blockerId))).toEqual([
      keys._id,
    ]);
    expect(res.body.data.report.days[0].blockers[0]).toMatchObject({
      _id: keys._id,
      resolvedBy: { _id: String(memberX._id) },
    });
  });

  it("R6 with keyBlockerId on one blocker clears isKey on every other; R5 keeps it", async () => {
    let res = await putDay(
      memberX,
      "mon",
      dayBody({ project, blockers: [{ text: "A" }] }),
    );
    const report = res.body.data.report;
    res = await putDay(memberX, "tue", {
      ...dayBody({ task: report.days[0].lines[0].task._id }),
      blockers: [{ text: "B" }],
    });
    const [a, b] = res.body.data.report.days.map((d) => d.blockers[0]._id);

    res = await autosave(memberX, report._id, { keyBlockerId: a });
    expect(res.body.data.report.days.map((d) => d.blockers[0].isKey)).toEqual([
      true,
      false,
    ]);
    res = await autosave(memberX, report._id, { keyBlockerId: b });
    expect(res.body.data.report.days.map((d) => d.blockers[0].isKey)).toEqual([
      false,
      true,
    ]);

    // Re-saving Tuesday with the blocker's id keeps the flag.
    res = await putDay(memberX, "tue", {
      ...dayBody({ task: report.days[0].lines[0].task._id }),
      blockers: [{ _id: b, text: "B, edited" }],
    });
    expect(res.body.data.report.days[1].blockers[0]).toMatchObject({
      _id: b,
      isKey: true,
    });

    res = await autosave(memberX, report._id, { keyBlockerId: null });
    expect(
      res.body.data.report.days.flatMap((d) => d.blockers.map((x) => x.isKey)),
    ).toEqual([false, false]);
    res = await autosave(memberX, report._id, {
      keyBlockerId: "0123456789abcdef01234567",
    });
    expect(res.status).toBe(422);
    expect(res.body.error.fields).toHaveProperty("keyBlockerId");
  });
});

describe("carried over", () => {
  it("a blocker whose normalised text was in the author's previous week", async () => {
    await putDay(
      memberX,
      "fri",
      dayBody({ project, blockers: [{ text: "Waiting on  API keys" }] }),
      "2026-W39",
    );
    await putDay(
      memberY,
      "fri",
      dayBody({ project, blockers: [{ text: "VPN down" }] }),
      "2026-W39",
    );
    const res = await putDay(
      memberX,
      "mon",
      dayBody({
        project,
        blockers: [{ text: " waiting on API KEYS " }, { text: "VPN down" }],
      }),
    );
    expect(
      res.body.data.report.days[0].blockers.map((b) => [b.text, b.carriedOver]),
    ).toEqual([
      ["waiting on API KEYS", true],
      ["VPN down", false], // someone else's blocker last week
    ]);
  });
});

describe("R11 — the team-comment switch", () => {
  it("the author or a manager opens a day; a teammate can't; no posted day → 404", async () => {
    const view = await postWeek(memberX, project, ["mon"]);
    const url = (day) =>
      `/api/reports/${view.report._id}/days/${day}/team-comments`;

    let res = await api.put(url("mon")).set(as(memberY)).send({ open: true });
    expect(res.status).toBe(403);
    expect(res.body.error).toEqual({ code: "REPORT_FORBIDDEN" });

    res = await api.put(url("mon")).set(as(managerA)).send({ open: true });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      weekday: "mon",
      openToTeam: true,
      canComment: true,
    });

    res = await api
      .get(`/api/updates?weekKey=${WEEK}&weekday=mon`)
      .set(as(memberY));
    const x = res.body.data.items.find(
      (i) => i.user._id === String(memberX._id),
    );
    expect(x.day.canComment).toBe(true);

    res = await api.put(url("mon")).set(as(memberX)).send({ open: false });
    expect(res.body.data.openToTeam).toBe(false);

    res = await api.put(url("tue")).set(as(memberX)).send({ open: true });
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({ code: "REPORT_NOT_FOUND" });
  });
});

// ---------------------------------------------------------------- S5: day comments

const openDay = (user, reportId, weekday, open = true) =>
  api
    .put(`/api/reports/${reportId}/days/${weekday}/team-comments`)
    .set(as(user))
    .send({ open });

describe("15 · teammates comment only on an opened day", () => {
  it("member Y → C1 on X's closed day → 403; after X opens it → 201", async () => {
    const view = await postWeek(memberX, project, ["mon"]);
    const id = view.report._id;

    let res = await commentOnDay(memberY, id, "mon", "Can I help?");
    expect(res.status).toBe(403);
    expect(res.body.error).toEqual({ code: "COMMENT_NOT_ALLOWED" });
    expect((await Report.findById(id).lean()).days[0].comments).toHaveLength(0);

    expect((await openDay(memberX, id, "mon")).status).toBe(200);
    res = await commentOnDay(memberY, id, "mon", "Can I help?");
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ weekday: "mon", canComment: true });
    expect(res.body.data.comments).toHaveLength(1);
    expect(res.body.data.comments[0]).toMatchObject({
      text: "Can I help?",
      author: { _id: String(memberY._id), name: "Member Y." },
      editedAt: null,
      editableUntil: "2026-10-02T12:10:00.000Z",
      revisionNumber: null,
      kind: null,
      replies: [],
      isNew: false, // the writer's own
    });
  });

  it("after a manager opens it → 201; closed again → 403 for comments and replies", async () => {
    const view = await postWeek(memberX, project, ["mon"]);
    const id = view.report._id;
    await openDay(managerA, id, "mon");
    let res = await commentOnDay(memberY, id, "mon", "On it.");
    expect(res.status).toBe(201);
    const threadId = res.body.data.comments[0]._id;

    res = await reply(memberX, id, threadId, "Thanks.");
    expect(res.status).toBe(201);
    expect(res.body.data.replies).toHaveLength(1);

    await openDay(memberX, id, "mon", false);
    res = await commentOnDay(memberY, id, "mon", "Again");
    expect(res.status).toBe(403);
    expect(res.body.error).toEqual({ code: "COMMENT_NOT_ALLOWED" });
    res = await reply(memberY, id, threadId, "Again");
    expect(res.status).toBe(403);
    expect(res.body.error).toEqual({ code: "COMMENT_NOT_ALLOWED" });
    // The author and managers still write there.
    expect((await reply(memberX, id, threadId, "Closed now.")).status).toBe(
      201,
    );
    expect((await reply(admin, id, threadId, "Noted.")).status).toBe(201);
  });

  it("the author comments on their own day; a comment marks interactionAt", async () => {
    const view = await postWeek(memberX, project, ["mon"]);
    const res = await commentOnDay(
      memberX,
      view.report._id,
      "mon",
      "Forgot: QA",
    );
    expect(res.status).toBe(201);
    const report = await Report.findById(view.report._id).lean();
    expect(report.interactionAt.toISOString()).toBe("2026-10-02T12:00:00.000Z");
    expect(report.lastActivityAt).toBeUndefined(); // comments never move it
  });
});

describe("16 · managers comment on their own update", () => {
  it("manager A → C1 on A's own update → 201", async () => {
    const view = await postWeek(managerA, project, ["mon"]);
    const res = await commentOnDay(
      managerA,
      view.report._id,
      "mon",
      "Also: 1:1s",
    );
    expect(res.status).toBe(201);
    expect(res.body.data.comments[0].author._id).toBe(String(managerA._id));
  });
});

describe("17 · the 10-minute window, on the server's clock", () => {
  async function aComment() {
    const view = await postWeek(memberX, project, ["mon"]);
    const res = await commentOnDay(managerA, view.report._id, "mon", "First");
    expect(res.status).toBe(201);
    return { id: view.report._id, threadId: res.body.data.comments[0]._id };
  }

  it("edited at 9 min 59 s → 200; at 10 min 1 s → 403 EDIT_WINDOW_CLOSED", async () => {
    const { id, threadId } = await aComment();
    vi.setSystemTime(new Date("2026-10-02T12:09:59.000Z"));
    let res = await editComment(managerA, id, threadId, "First, edited");
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      _id: threadId,
      text: "First, edited",
      editedAt: "2026-10-02T12:09:59.000Z",
      editableUntil: "2026-10-02T12:10:00.000Z",
    });

    vi.setSystemTime(new Date("2026-10-02T12:10:01.000Z"));
    res = await editComment(managerA, id, threadId, "Too late");
    expect(res.status).toBe(403);
    expect(res.body.error).toEqual({ code: "EDIT_WINDOW_CLOSED" });
    res = await deleteComment(managerA, id, threadId);
    expect(res.status).toBe(403);
    expect(res.body.error).toEqual({ code: "EDIT_WINDOW_CLOSED" });
    const stored = (await Report.findById(id).lean()).days[0].comments[0];
    expect(stored.text).toBe("First, edited");
  });

  it("deleting a comment with a reply → 409 COMMENT_HAS_REPLIES; editing it still works", async () => {
    const { id, threadId } = await aComment();
    expect((await reply(memberX, id, threadId, "Ok")).status).toBe(201);
    let res = await deleteComment(managerA, id, threadId);
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: "COMMENT_HAS_REPLIES" });
    res = await editComment(managerA, id, threadId, "First (edited)");
    expect(res.status).toBe(200);
  });

  it("someone else can't edit or delete it, even inside the window", async () => {
    const { id, threadId } = await aComment();
    for (const user of [memberX, admin]) {
      let res = await editComment(user, id, threadId, "Not mine");
      expect(res.status).toBe(403);
      expect(res.body.error).toEqual({ code: "EDIT_WINDOW_CLOSED" });
      res = await deleteComment(user, id, threadId);
      expect(res.status).toBe(403);
    }
  });

  it("a reply has its own window; deleting a reply or a bare comment answers the day", async () => {
    const { id, threadId } = await aComment();
    vi.setSystemTime(new Date("2026-10-02T12:05:00.000Z"));
    let res = await reply(memberX, id, threadId, "Reply");
    const replyId = res.body.data.replies[0]._id;
    expect(res.body.data.replies[0].editableUntil).toBe(
      "2026-10-02T12:15:00.000Z",
    );

    vi.setSystemTime(new Date("2026-10-02T12:14:00.000Z"));
    res = await editComment(memberX, id, threadId, "Reply, edited", replyId);
    expect(res.status).toBe(200);
    expect(res.body.data.replies[0]).toMatchObject({
      text: "Reply, edited",
      editedAt: "2026-10-02T12:14:00.000Z",
    });
    // The comment's own window has closed; the reply's hasn't.
    expect((await editComment(managerA, id, threadId, "x")).status).toBe(403);

    res = await deleteComment(memberX, id, threadId, replyId);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ weekday: "mon" });
    expect(res.body.data.comments[0].replies).toEqual([]);

    vi.setSystemTime(new Date("2026-10-02T12:20:00.000Z"));
    res = await commentOnDay(managerA, id, "mon", "Second");
    const second = res.body.data.comments[1]._id;
    res = await deleteComment(managerA, id, second);
    expect(res.status).toBe(200);
    expect(res.body.data.comments.map((c) => c._id)).toEqual([threadId]);
  });
});

describe("C1–C5 on day threads", () => {
  it("any status: a comment on a submitted week's day → 201", async () => {
    const view = await filedWeek(memberX, project);
    expect(view.report.status).toBe("submitted");
    const res = await commentOnDay(managerA, view.report._id, "tue", "Nice");
    expect(res.status).toBe(201);
  });

  it("no posted day → 404 REPORT_NOT_FOUND; an unknown thread → 404 THREAD_NOT_FOUND", async () => {
    const view = await postWeek(memberX, project, ["mon"]);
    const id = view.report._id;
    let res = await commentOnDay(managerA, id, "tue", "Hello");
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({ code: "REPORT_NOT_FOUND" });
    const ghost = "0123456789abcdef01234567";
    res = await commentOnDay(managerA, ghost, "mon", "Hello");
    expect(res.body.error).toEqual({ code: "REPORT_NOT_FOUND" });
    for (const call of [
      () => reply(managerA, id, ghost, "Hi"),
      () => editComment(managerA, id, ghost, "Hi"),
      () => deleteComment(managerA, id, ghost),
    ]) {
      res = await call();
      expect(res.status).toBe(404);
      expect(res.body.error).toEqual({ code: "THREAD_NOT_FOUND" });
    }
  });

  it("validates the text: empty or over 2000 characters → 422", async () => {
    const view = await postWeek(memberX, project, ["mon"]);
    for (const text of ["   ", "x".repeat(2001)]) {
      const res = await commentOnDay(memberX, view.report._id, "mon", text);
      expect(res.status).toBe(422);
      expect(res.body.error.fields).toHaveProperty("text");
    }
    const res = await commentOnDay(memberX, view.report._id, "mon", "  ok  ");
    expect(res.body.data.comments[0].text).toBe("ok");
  });

  it("the thread shows on every read of the day", async () => {
    const view = await postWeek(memberX, project, ["mon"]);
    const res = await commentOnDay(managerA, view.report._id, "mon", "Seen");
    const threadId = res.body.data.comments[0]._id;
    const week = await api
      .get(`/api/users/${memberX._id}/reports/${WEEK}`)
      .set(as(memberY));
    expect(week.body.data.report.days[0].comments[0]._id).toBe(threadId);
    const feed = await api
      .get(`/api/updates?weekKey=${WEEK}&weekday=mon`)
      .set(as(memberY));
    const x = feed.body.data.items.find(
      (i) => i.user._id === String(memberX._id),
    );
    expect(x.day.comments[0]).toMatchObject({ _id: threadId, isNew: false });
  });
});
