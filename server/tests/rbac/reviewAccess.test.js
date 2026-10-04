import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Project } from "../../src/models/projectModel.js";
import { Report } from "../../src/models/reportModel.js";
import { Revision } from "../../src/models/revisionModel.js";
import { createUser } from "../helpers/testAuth.js";
import { clearDb } from "../helpers/testDb.js";
import {
  WEEK,
  api,
  approve,
  as,
  autosave,
  commentOnWeek,
  deleteComment,
  editComment,
  filedWeek,
  freezeAt,
  markSeen,
  postWeek,
  putDay,
  reply,
  sendBack,
  submit,
} from "../helpers/testWeeks.js";

// api_specification.md §6.5 — items 26–32: the role gate, the self-review guard, approving
// an unrequested report, the review desk, review races and the stale pin. Also the
// week-comment rules (C2, C3, C5 on week threads), V3's filters, V4, and S5's done list:
// the full correction cycle of database_schema.md §3.4.

let admin, managerA, managerB, memberX, memberY, project, other;

beforeEach(async () => {
  await clearDb();
  freezeAt("2026-10-02T12:00:00"); // Friday of 2026-W40
  admin = await createUser({ name: "Admin D.", role: "admin" });
  managerA = await createUser({ name: "Manager A.", role: "manager" });
  managerB = await createUser({ name: "Manager B.", role: "manager" });
  memberX = await createUser({ name: "Member X.", role: "member" });
  memberY = await createUser({ name: "Member Y.", role: "member" });
  project = await Project.create({ name: "Client A" });
  other = await Project.create({ name: "Beta" });
});

afterEach(() => {
  vi.useRealTimers();
});

const desk = (user, query = "") =>
  api.get(`/api/review-desk${query}`).set(as(user));
const deskCount = (user) => api.get("/api/review-desk/count").set(as(user));
const sendBackRaw = (user, reportId, body) =>
  api
    .post(`/api/reports/${reportId}/review/send-back`)
    .set(as(user))
    .send(body);
const idsOf = (res) => res.body.data.items.map((i) => i._id);

describe("26 · members never reach review", () => {
  it("member → V1, V2, V3, V4, C2 → 403 FORBIDDEN", async () => {
    const view = await filedWeek(memberX, project, { requestApproval: true });
    const id = view.report._id;
    const calls = [
      () => approve(id, memberY),
      () =>
        sendBackRaw(memberY, id, {
          revisionNumber: 1,
          comment: "Needs more detail.",
        }),
      () => desk(memberY),
      () => deskCount(memberY),
      () => commentOnWeek(memberY, id, "Nice week"),
      () => commentOnWeek(memberX, id, "My own week"),
    ];
    for (const call of calls) {
      const res = await call();
      expect(res.status).toBe(403);
      expect(res.body.error).toEqual({ code: "FORBIDDEN" });
    }
    const report = await Report.findById(id).lean();
    expect(report.status).toBe("submitted");
    expect(report.weekComments).toHaveLength(0);
  });
});

describe("27 · nobody reviews their own report", () => {
  it("manager A approving or sending back A's own → 403 SELF_REVIEW_FORBIDDEN; manager B → 200", async () => {
    const view = await filedWeek(managerA, project, { requestApproval: true });
    const id = view.report._id;
    let res = await approve(id, managerA);
    expect(res.status).toBe(403);
    expect(res.body.error).toEqual({ code: "SELF_REVIEW_FORBIDDEN" });
    res = await sendBackRaw(managerA, id, {
      revisionNumber: 1,
      comment: "Sending my own back",
    });
    expect(res.body.error).toEqual({ code: "SELF_REVIEW_FORBIDDEN" });
    expect((await Revision.findOne({ report: id }).lean()).action).toBeNull();

    res = await approve(id, managerB);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ state: "approved" });
    expect(res.body.data.report).toMatchObject({
      status: "approved",
      revisionNumber: 1,
      latestComment: null,
      weekComments: [], // no comment, no thread
    });
    const revision = await Revision.findOne({ report: id }).lean();
    expect(revision).toMatchObject({ action: "approved" });
    expect(String(revision.reviewedBy)).toBe(String(managerB._id));
    expect(revision.reviewedAt.toISOString()).toBe("2026-10-02T12:00:00.000Z");
    expect(revision.comment).toBeUndefined();
  });

  it("an admin approves a manager's report", async () => {
    const view = await filedWeek(managerA, project);
    expect((await approve(view.report._id, admin)).status).toBe(200);
  });
});

describe("28 · approval is optional; any submitted report can be approved", () => {
  it("manager B approving a report that did not ask → 200", async () => {
    const view = await filedWeek(memberX, project);
    expect(view.report.approvalRequested).toBe(false);
    const res = await approve(view.report._id, managerB, {
      comment: "  Good week.  ",
    });
    expect(res.status).toBe(200);
    expect(res.body.data.report.status).toBe("approved");
    // A comment given with an approval is a week thread on its revision, and on the revision.
    expect(res.body.data.report.weekComments).toHaveLength(1);
    expect(res.body.data.report.weekComments[0]).toMatchObject({
      text: "Good week.",
      kind: "approval",
      revisionNumber: 1,
      author: { _id: String(managerB._id) },
    });
    const revision = await Revision.findOne({ report: view.report._id }).lean();
    expect(revision.comment).toBe("Good week.");
  });

  it("only a submitted report: draft, approved and needs_correction → 409 with the status", async () => {
    const draft = await postWeek(memberY, project, ["mon"]);
    let res = await api
      .post(`/api/reports/${draft.report._id}/review/approve`)
      .set(as(managerB))
      .send({ revisionNumber: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({
      code: "REPORT_STATE_CHANGED",
      status: "draft",
    });

    const view = await filedWeek(memberX, project);
    const id = view.report._id;
    await sendBack(id, managerA);
    res = await approve(id, managerB);
    expect(res.body.error).toEqual({
      code: "REPORT_STATE_CHANGED",
      status: "needs_correction",
    });
    res = await submit(memberX, id);
    expect(res.status).toBe(200);
    expect((await approve(id, managerB)).status).toBe(200);
    res = await sendBackRaw(managerA, id, {
      revisionNumber: 2,
      comment: "Too late for this.",
    });
    expect(res.body.error).toEqual({
      code: "REPORT_STATE_CHANGED",
      status: "approved",
    });
  });

  it("an unknown report → 404; a malformed id → 422", async () => {
    let res = await api
      .post("/api/reports/0123456789abcdef01234567/review/approve")
      .set(as(managerB))
      .send({ revisionNumber: 1 });
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({ code: "REPORT_NOT_FOUND" });
    res = await api
      .post("/api/reports/not-an-id/review/approve")
      .set(as(managerB))
      .send({ revisionNumber: 1 });
    expect(res.status).toBe(422);
  });
});

describe("29 · the review desk", () => {
  async function fileAll() {
    const asked = await filedWeek(memberX, project, { requestApproval: true });
    const notAsked = await filedWeek(memberY, other);
    const own = await filedWeek(managerA, project, { requestApproval: true });
    const managerB_ = await filedWeek(managerB, project, {
      requestApproval: true,
    });
    await postWeek(admin, project, ["mon"]); // a Draft never appears
    return {
      asked: asked.report._id,
      notAsked: notAsked.report._id,
      own: own.report._id,
      managerB: managerB_.report._id,
    };
  }

  it("defaults to approval requested; approval=all adds the rest; never the actor's own", async () => {
    const ids = await fileAll();
    let res = await desk(managerA);
    expect(res.status).toBe(200);
    expect(idsOf(res).sort()).toEqual([ids.asked, ids.managerB].sort());
    expect(res.body.data.meta).toEqual({
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
    });

    res = await desk(managerA, "?approval=all");
    expect(idsOf(res).sort()).toEqual(
      [ids.asked, ids.notAsked, ids.managerB].sort(),
    );

    // A's own report stays out under every filter combination.
    for (const query of [
      `?person=${managerA._id}`,
      `?approval=all&person=${managerA._id},${memberX._id}`,
      "?approval=all&role=manager",
      `?approval=all&project=${project._id}`,
      `?approval=all&weekFrom=${WEEK}&weekTo=${WEEK}`,
    ]) {
      res = await desk(managerA, query);
      expect(res.status, query).toBe(200);
      expect(idsOf(res), query).not.toContain(ids.own);
    }
    res = await desk(managerB, "?approval=all&role=manager");
    expect(idsOf(res)).toEqual([ids.own]);
  });

  it("serves the item shape; filters by person, role, project and weeks", async () => {
    const ids = await fileAll();
    let res = await desk(admin, `?person=${memberX._id}`);
    expect(res.body.data.items).toEqual([
      {
        _id: ids.asked,
        author: {
          _id: String(memberX._id),
          name: "Member X.",
          role: "member",
          status: "active",
          onLeave: false,
        },
        projects: [
          { _id: String(project._id), name: "Client A", status: "active" },
        ],
        weekKey: WEEK,
        weekStart: "2026-09-28",
        weekEnd: "2026-10-02",
        status: "submitted",
        approvalRequested: true,
        revisionNumber: 1,
        submittedAt: "2026-10-02T12:00:00.000Z",
        isNew: true,
      },
    ]);
    res = await desk(admin, "?approval=all&role=member");
    expect(idsOf(res).sort()).toEqual([ids.asked, ids.notAsked].sort());
    res = await desk(admin, `?approval=all&project=${other._id}`);
    expect(idsOf(res)).toEqual([ids.notAsked]);
    res = await desk(admin, "?approval=all&weekTo=2026-W39");
    expect(idsOf(res)).toEqual([]);
  });

  it("sorts by submittedAt (asc by default) or weekKey; pages", async () => {
    vi.setSystemTime(new Date("2026-10-02T09:00:00.000Z"));
    const later = await filedWeek(memberX, project, { requestApproval: true });
    vi.setSystemTime(new Date("2026-10-02T10:00:00.000Z"));
    const earlierWeek = await filedWeek(memberY, project, {
      requestApproval: true,
      week: "2026-W39",
    });
    let res = await desk(managerA);
    expect(idsOf(res)).toEqual([later.report._id, earlierWeek.report._id]);
    res = await desk(managerA, "?dir=desc");
    expect(idsOf(res)).toEqual([earlierWeek.report._id, later.report._id]);
    res = await desk(managerA, "?sort=weekKey");
    expect(idsOf(res)).toEqual([earlierWeek.report._id, later.report._id]);
    res = await desk(managerA, "?sort=name");
    expect(res.status).toBe(422);
    res = await desk(managerA, "?limit=20&page=2");
    expect(res.body.data).toEqual({
      items: [],
      meta: { page: 2, limit: 20, total: 2, totalPages: 1 },
    });
    res = await desk(managerA, "?person=nope");
    expect(res.status).toBe(422);
    res = await desk(managerA, "?role=owner");
    expect(res.status).toBe(422);
  });

  it("V4 counts requested reports not opened since their latest submission", async () => {
    const ids = await fileAll();
    let res = await deskCount(managerA);
    expect(res.body.data).toEqual({ count: 2 }); // X and B; not A's own
    expect((await deskCount(managerB)).body.data).toEqual({ count: 2 });

    expect((await markSeen(managerA, ids.asked)).status).toBe(200);
    expect((await deskCount(managerA)).body.data).toEqual({ count: 1 });
    expect((await deskCount(managerB)).body.data).toEqual({ count: 2 });

    // Sent back and resubmitted (asking again) → counted again for A.
    vi.setSystemTime(new Date("2026-10-02T12:30:00.000Z"));
    await sendBack(ids.asked, managerB);
    expect((await deskCount(managerA)).body.data).toEqual({ count: 1 });
    vi.setSystemTime(new Date("2026-10-02T13:00:00.000Z"));
    expect((await submit(memberX, ids.asked, true)).status).toBe(200);
    expect((await deskCount(managerA)).body.data).toEqual({ count: 2 });
  });
});

describe("30 · two reviewers at once", () => {
  it("two managers approving concurrently → one 200, one 409; the winner's reviewedBy stands", async () => {
    const view = await filedWeek(memberX, project, { requestApproval: true });
    const id = view.report._id;
    const results = await Promise.all([
      approve(id, managerA),
      approve(id, managerB),
    ]);
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([200, 409]);
    const loser = results.find((r) => r.status === 409);
    expect(loser.body.error.code).toBe("REPORT_STATE_CHANGED");
    const winner = results[0].status === 200 ? managerA : managerB;
    const revision = await Revision.findOne({ report: id }).lean();
    expect(String(revision.reviewedBy)).toBe(String(winner._id));
    expect(await Revision.countDocuments({ report: id })).toBe(1);
  });

  it("an approve and a send-back at once → exactly one outcome on the revision and the report", async () => {
    const view = await filedWeek(memberX, project);
    const id = view.report._id;
    const results = await Promise.all([
      approve(id, managerA),
      sendBackRaw(managerB, id, {
        revisionNumber: 1,
        comment: "Please split the hours.",
      }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const [revision, report] = await Promise.all([
      Revision.findOne({ report: id }).lean(),
      Report.findById(id).lean(),
    ]);
    expect(report.status).toBe(
      revision.action === "approved" ? "approved" : "needs_correction",
    );
    expect(report.weekComments).toHaveLength(
      revision.action === "approved" ? 0 : 1,
    );
  });
});

describe("31 · the stale pin", () => {
  it("B approves revisionNumber 1 after rev 2 was submitted → 409, nothing written", async () => {
    const view = await filedWeek(memberX, project);
    const id = view.report._id;
    await sendBack(id, managerA);
    expect((await submit(memberX, id)).status).toBe(200);

    const before = await Report.findById(id).lean();
    const res = await approve(id, managerB, { revisionNumber: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({
      code: "REPORT_STATE_CHANGED",
      status: "submitted",
    });
    const after = await Report.findById(id).lean();
    expect(after.status).toBe("submitted");
    expect(after.updatedAt).toEqual(before.updatedAt);
    const revisions = await Revision.find({ report: id })
      .sort({ revisionNumber: 1 })
      .lean();
    expect(revisions.map((r) => r.action)).toEqual(["changes_requested", null]);

    expect((await approve(id, managerB, { revisionNumber: 2 })).status).toBe(
      200,
    );
  });
});

describe("32 · sending back", () => {
  it("a 9-character comment → 422 fields.comment; a valid one → a send_back week thread on the revision", async () => {
    const view = await filedWeek(memberX, project);
    const id = view.report._id;
    let res = await sendBackRaw(managerA, id, {
      revisionNumber: 1,
      comment: "  123456789  ",
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(res.body.error.fields).toHaveProperty("comment");
    res = await sendBackRaw(managerA, id, { revisionNumber: 1 });
    expect(res.body.error.fields).toHaveProperty("comment");
    expect((await Report.findById(id).lean()).status).toBe("submitted");

    res = await sendBackRaw(managerA, id, {
      revisionNumber: 1,
      comment: "Hours by type look off.",
    });
    expect(res.status).toBe(200);
    const report = res.body.data.report;
    expect(report.status).toBe("needs_correction");
    expect(report.contentSource).toBe("revision");
    expect(report.weekComments).toEqual([
      expect.objectContaining({
        text: "Hours by type look off.",
        kind: "send_back",
        revisionNumber: 1,
        author: expect.objectContaining({ _id: String(managerA._id) }),
        replies: [],
      }),
    ]);
    expect(report.latestComment).toMatchObject({
      text: "Hours by type look off.",
      revisionNumber: 1,
      author: { _id: String(managerA._id) },
      createdAt: "2026-10-02T12:00:00.000Z",
    });
    const revision = await Revision.findOne({ report: id }).lean();
    expect(revision).toMatchObject({
      action: "changes_requested",
      comment: "Hours by type look off.",
    });
  });
});

describe("week comments — C2, C3, C5 on the week", () => {
  it("managers comment on a submitted or approved week; a Draft → 409; their own → 403", async () => {
    const draft = await postWeek(memberY, project, ["mon"]);
    let res = await commentOnWeek(managerA, draft.report._id, "Early thoughts");
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({
      code: "REPORT_STATE_CHANGED",
      status: "draft",
    });

    const own = await filedWeek(managerA, project);
    res = await commentOnWeek(managerA, own.report._id, "My own week");
    expect(res.status).toBe(403);
    expect(res.body.error).toEqual({ code: "COMMENT_NOT_ALLOWED" });

    const view = await filedWeek(memberX, project);
    res = await commentOnWeek(managerB, view.report._id, "Solid progress.");
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({
      weekComments: [
        expect.objectContaining({
          text: "Solid progress.",
          kind: "comment",
          revisionNumber: 1,
          isNew: false,
        }),
      ],
    });
    await approve(view.report._id, managerA);
    res = await commentOnWeek(admin, view.report._id, "Agreed.");
    expect(res.status).toBe(201);
    expect(res.body.data.weekComments).toHaveLength(2);
  });

  it("the author and managers reply; a teammate can't", async () => {
    const view = await filedWeek(memberX, project);
    const id = view.report._id;
    const res = await commentOnWeek(managerA, id, "Why two days on QA?");
    const threadId = res.body.data.weekComments[0]._id;

    let r = await reply(memberX, id, threadId, "The client added cases.");
    expect(r.status).toBe(201);
    expect(r.body.data).toMatchObject({
      _id: threadId,
      kind: "comment",
      revisionNumber: 1,
    });
    expect(r.body.data.replies).toHaveLength(1);
    r = await reply(managerB, id, threadId, "Makes sense.");
    expect(r.status).toBe(201);
    expect(r.body.data.replies).toHaveLength(2);

    r = await reply(memberY, id, threadId, "Me too");
    expect(r.status).toBe(403);
    expect(r.body.error).toEqual({ code: "COMMENT_NOT_ALLOWED" });
    r = await editComment(memberY, id, threadId, "Me too");
    expect(r.status).toBe(403);
    expect(r.body.error).toEqual({ code: "EDIT_WINDOW_CLOSED" });
    // Nothing of the thread reached the teammate.
    expect(JSON.stringify(r.body)).not.toContain("Why two days");
  });

  it("a send-back comment can't be deleted, even by its writer in time; a plain one can", async () => {
    const view = await filedWeek(memberX, project);
    const id = view.report._id;
    await sendBack(id, managerA);
    const report = await Report.findById(id).lean();
    const sendBackId = String(report.weekComments[0]._id);
    let res = await deleteComment(managerA, id, sendBackId);
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: "COMMENT_HAS_REPLIES" });
    // It can still be edited in its window.
    res = await editComment(
      managerA,
      id,
      sendBackId,
      "Hours by type look wrong.",
    );
    expect(res.status).toBe(200);

    res = await commentOnWeek(managerB, id, "One more thing");
    const plainId = res.body.data.weekComments[1]._id;
    res = await deleteComment(managerB, id, plainId);
    expect(res.status).toBe(200);
    expect(res.body.data.weekComments.map((t) => t._id)).toEqual([sendBackId]);
  });
});

describe("S5 done list — the full correction cycle (database_schema.md §3.4)", () => {
  it("submit → send back → correct → resubmit → another manager approves", async () => {
    // 1–2. Mon–Fri, then submit asking for approval: rev 1 { C1, D1 }.
    const view = await postWeek(memberX, project);
    const id = view.report._id;
    const taskId = view.report.tasks[0].task._id;
    await autosave(memberX, id, {
      tasks: [{ task: taskId, status: "in_progress", note: "C1 note" }],
      notes: "C1 notes",
    });
    vi.setSystemTime(new Date("2026-10-02T13:00:00.000Z"));
    let res = await submit(memberX, id, true);
    expect(res.status).toBe(200);
    expect(res.body.data.report).toMatchObject({
      status: "submitted",
      approvalRequested: true,
      revisionNumber: 1,
    });
    expect((await desk(managerA)).body.data.items.map((i) => i._id)).toEqual([
      id,
    ]);

    // 3. Manager A sends back.
    vi.setSystemTime(new Date("2026-10-02T14:00:00.000Z"));
    res = await sendBackRaw(managerA, id, {
      revisionNumber: 1,
      comment: "Hours by type look off.",
    });
    expect(res.status).toBe(200);
    let report = await Report.findById(id).lean();
    expect(report.status).toBe("needs_correction");
    expect(report.latestComment.text).toBe("Hours by type look off.");
    expect(report.weekComments.map((t) => t.kind)).toEqual(["send_back"]);
    expect(report.lastActivityAt.toISOString()).toBe(
      "2026-10-02T14:00:00.000Z",
    );
    expect((await desk(managerA)).body.data.items).toEqual([]);

    // The author sees the comment on their week, and replies to it.
    res = await api.get(`/api/reports/week/${WEEK}`).set(as(memberX));
    expect(res.body.data.report.latestComment.text).toBe(
      "Hours by type look off.",
    );
    expect(res.body.data.report.weekComments[0].isNew).toBe(true);
    const threadId = res.body.data.report.weekComments[0]._id;
    expect((await reply(memberX, id, threadId, "Fixing now.")).status).toBe(
      201,
    );

    // 4. The author corrects: content C2 live, Friday's day edited (D2).
    await autosave(memberX, id, {
      tasks: [{ task: taskId, status: "done", note: "C2 note" }],
      notes: "C2 notes",
    });
    res = await putDay(memberX, "fri", {
      lines: [
        { task: taskId, taskType: "testing", text: "Re-tested", hours: 6 },
      ],
      blockers: [],
      openToTeam: false,
    });
    expect(res.status).toBe(200);
    // Managers read revision 1's content while the correction is in progress.
    res = await api.get(`/api/reports/${id}`).set(as(managerB));
    expect(res.body.data.report).toMatchObject({
      contentSource: "revision",
      contentRevisionNumber: 1,
      content: { notes: "C1 notes" },
    });
    res = await api.get(`/api/reports/${id}`).set(as(memberX));
    expect(res.body.data.report.content.notes).toBe("C2 notes");

    // 5. Resubmits: rev 2 { C2, D2 }; rev 1 untouched.
    vi.setSystemTime(new Date("2026-10-02T15:00:00.000Z"));
    res = await submit(memberX, id, true);
    expect(res.status).toBe(200);
    expect(res.body.data.report).toMatchObject({
      status: "submitted",
      revisionNumber: 2,
      latestComment: null,
    });

    // 6. Another manager approves revision 2.
    vi.setSystemTime(new Date("2026-10-02T16:00:00.000Z"));
    res = await approve(id, managerB, { revisionNumber: 2 });
    expect(res.status).toBe(200);
    expect(res.body.data.report).toMatchObject({
      status: "approved",
      revisionNumber: 2,
      content: { notes: "C2 notes" },
      contentSource: "live",
    });

    const revisions = await Revision.find({ report: id })
      .sort({ revisionNumber: 1 })
      .lean();
    expect(revisions).toHaveLength(2);
    expect(revisions[0]).toMatchObject({
      revisionNumber: 1,
      action: "changes_requested",
      comment: "Hours by type look off.",
      content: { notes: "C1 notes" },
    });
    expect(String(revisions[0].reviewedBy)).toBe(String(managerA._id));
    expect(
      revisions[0].days.find((d) => d.weekday === "fri").lines[0].text,
    ).toBe("Worked on it");
    expect(revisions[1]).toMatchObject({
      revisionNumber: 2,
      action: "approved",
      content: { notes: "C2 notes" },
    });
    expect(String(revisions[1].reviewedBy)).toBe(String(managerB._id));
    expect(
      revisions[1].days.find((d) => d.weekday === "fri").lines[0].text,
    ).toBe("Re-tested");

    report = await Report.findById(id).lean();
    expect(report.lastActivityAt.toISOString()).toBe(
      "2026-10-02T16:00:00.000Z",
    );
    expect(report.weekComments).toHaveLength(1); // the send-back, with its reply
    expect(report.weekComments[0].replies).toHaveLength(1);

    // The history shows both versions with their outcomes.
    res = await api.get(`/api/reports/${id}/revisions`).set(as(memberX));
    expect(
      res.body.data.items.map((r) => [r.revisionNumber, r.action, r.isCurrent]),
    ).toEqual([
      [2, "approved", true],
      [1, "changes_requested", false],
    ]);
  });
});
