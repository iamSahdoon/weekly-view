import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Project } from "../../src/models/projectModel.js";
import { Report } from "../../src/models/reportModel.js";
import { isReportNew, isThreadNew } from "../../src/services/markerService.js";
import { createUser } from "../helpers/testAuth.js";
import { clearDb } from "../helpers/testDb.js";
import {
  WEEK,
  api,
  approve,
  as,
  commentOnDay,
  commentOnWeek,
  filedWeek,
  freezeAt,
  markSeen,
  postWeek,
  reply,
  sendBack,
} from "../helpers/testWeeks.js";

// "New" markers (api_specification.md §2.10, database_schema.md §5.4): `isNew` on report
// rows (R1, U7, V3), on day and week threads, and N1's sidebar dots. Something is new
// when it concerns the reader and arrived after their seen mark (R13).

let managerA, managerB, memberX, memberY, memberZ, project;

beforeEach(async () => {
  await clearDb();
  freezeAt("2026-10-02T12:00:00"); // Friday of 2026-W40
  managerA = await createUser({ name: "Manager A.", role: "manager" });
  managerB = await createUser({ name: "Manager B.", role: "manager" });
  memberX = await createUser({ name: "Member X.", role: "member" });
  memberY = await createUser({ name: "Member Y.", role: "member" });
  memberZ = await createUser({ name: "Member Z.", role: "member" });
  project = await Project.create({ name: "Client A" });
});

afterEach(() => {
  vi.useRealTimers();
});

const tick = (time) => vi.setSystemTime(new Date(`2026-10-02T${time}.000Z`));
const myRows = async (user) =>
  (await api.get("/api/reports").set(as(user))).body.data.items;
const myWeek = async (user) =>
  (await api.get(`/api/reports/week/${WEEK}`).set(as(user))).body.data;
const newMarks = async (user) =>
  (await api.get("/api/me/new").set(as(user))).body.data;
const feedEntry = async (reader, author) => {
  const res = await api
    .get(`/api/updates?weekKey=${WEEK}&weekday=mon`)
    .set(as(reader));
  return res.body.data.items.find((i) => i.user._id === String(author._id));
};

describe("rows — the author's own reports", () => {
  it("a status change by a reviewer is new until the author opens the week", async () => {
    const view = await filedWeek(memberX, project);
    const id = view.report._id;
    tick("12:01:00");
    await markSeen(memberX, id);
    expect((await myRows(memberX))[0].isNew).toBe(false);

    tick("12:05:00");
    await sendBack(id, managerA);
    expect((await myRows(memberX))[0].isNew).toBe(true);
    tick("12:06:00");
    await markSeen(memberX, id);
    expect((await myRows(memberX))[0].isNew).toBe(false);
  });

  it("the author's own comment is never new for them", async () => {
    const view = await postWeek(memberX, project, ["mon"]);
    await markSeen(memberX, view.report._id);
    tick("12:01:00");
    await commentOnDay(memberX, view.report._id, "mon", "A note to myself");
    expect((await myRows(memberX))[0].isNew).toBe(false);
  });

  it("an approval with no comment is new for the author", async () => {
    const view = await filedWeek(memberX, project);
    await markSeen(memberX, view.report._id);
    tick("12:10:00");
    await approve(view.report._id, managerB);
    expect((await myRows(memberX))[0].isNew).toBe(true);
  });
});

describe("threads — on the reader's own week, or ones they wrote in", () => {
  it("a manager's comment on the author's day is new for the author, not the writer", async () => {
    const view = await postWeek(memberX, project, ["mon"]);
    const id = view.report._id;
    await markSeen(memberX, id);
    tick("12:01:00");
    let res = await commentOnDay(managerA, id, "mon", "Chased the keys.");
    expect(res.body.data.comments[0].isNew).toBe(false); // the writer's view
    const threadId = res.body.data.comments[0]._id;

    let week = await myWeek(memberX);
    expect(week.report.days[0].comments[0].isNew).toBe(true);
    expect((await myRows(memberX))[0].isNew).toBe(true);
    expect((await newMarks(memberX)).nav.thisWeek).toBe(true);

    tick("12:02:00");
    await markSeen(memberX, id);
    week = await myWeek(memberX);
    expect(week.report.days[0].comments[0].isNew).toBe(false);
    expect((await newMarks(memberX)).nav.thisWeek).toBe(false);

    // The author replies → new for the manager, who wrote in the thread.
    tick("12:03:00");
    await reply(memberX, id, threadId, "Thanks.");
    res = await api.get(`/api/reports/${id}`).set(as(managerA));
    expect(res.body.data.report.days[0].comments[0].isNew).toBe(true);
    // Another manager never wrote there, and it isn't their week.
    res = await api.get(`/api/reports/${id}`).set(as(managerB));
    expect(res.body.data.report.days[0].comments[0].isNew).toBe(false);
  });

  it("a teammate who commented sees the reply as new; a teammate who didn't, doesn't", async () => {
    const view = await postWeek(memberX, project, ["mon"]);
    const id = view.report._id;
    await api
      .put(`/api/reports/${id}/days/mon/team-comments`)
      .set(as(memberX))
      .send({ open: true });
    let res = await commentOnDay(memberY, id, "mon", "Need a hand?");
    const threadId = res.body.data.comments[0]._id;
    await markSeen(memberY, id);

    tick("12:05:00");
    await reply(memberX, id, threadId, "Yes please.");
    expect((await feedEntry(memberY, memberX)).day.comments[0].isNew).toBe(
      true,
    );
    expect((await feedEntry(memberZ, memberX)).day.comments[0].isNew).toBe(
      false,
    );
    tick("12:06:00");
    await markSeen(memberY, id);
    expect((await feedEntry(memberY, memberX)).day.comments[0].isNew).toBe(
      false,
    );
  });

  it("a week comment is new for the author; a reply to it is new for the manager", async () => {
    const view = await filedWeek(memberX, project);
    const id = view.report._id;
    await markSeen(memberX, id);
    await markSeen(managerA, id);
    tick("12:05:00");
    let res = await commentOnWeek(managerA, id, "Why two days on QA?");
    const threadId = res.body.data.weekComments[0]._id;
    expect((await myWeek(memberX)).report.weekComments[0].isNew).toBe(true);

    tick("12:06:00");
    await reply(memberX, id, threadId, "New test cases.");
    res = await api.get(`/api/reports/${id}`).set(as(managerA));
    expect(res.body.data.report.weekComments[0].isNew).toBe(true);
    res = await api.get(`/api/users/${memberX._id}/reports`).set(as(managerA));
    expect(res.body.data.items.find((r) => r._id === id).isNew).toBe(true);
  });
});

describe("approval requests — managers and admins", () => {
  it("V3 and U7 rows are new until that manager opens the week", async () => {
    const view = await filedWeek(memberX, project, { requestApproval: true });
    const id = view.report._id;
    let res = await api.get("/api/review-desk").set(as(managerA));
    expect(res.body.data.items[0].isNew).toBe(true);
    res = await api.get(`/api/users/${memberX._id}/reports`).set(as(managerA));
    expect(res.body.data.items.find((r) => r._id === id).isNew).toBe(true);

    tick("12:01:00");
    await markSeen(managerA, id);
    res = await api.get("/api/review-desk").set(as(managerA));
    expect(res.body.data.items[0].isNew).toBe(false);
    res = await api.get("/api/review-desk").set(as(managerB));
    expect(res.body.data.items[0].isNew).toBe(true);
  });

  it("a submitted report that didn't ask is not an approval request", async () => {
    await filedWeek(memberX, project);
    const res = await api
      .get("/api/review-desk?approval=all")
      .set(as(managerA));
    expect(res.body.data.items[0].isNew).toBe(false);
  });
});

describe("N1 — the sidebar's dots", () => {
  it("a member: reviewRequests 0; thisWeek and myReports from their own reports", async () => {
    expect(await newMarks(memberX)).toEqual({
      reviewRequests: 0,
      nav: { thisWeek: false, myReports: false },
    });
    const older = await filedWeek(memberX, project, { week: "2026-W38" });
    await markSeen(memberX, older.report._id);
    tick("12:01:00");
    await sendBack(older.report._id, managerA);
    expect(await newMarks(memberX)).toEqual({
      reviewRequests: 0,
      nav: { thisWeek: false, myReports: true },
    });
    tick("12:02:00");
    await markSeen(memberX, older.report._id);
    expect((await newMarks(memberX)).nav.myReports).toBe(false);
  });

  it("a manager: reviewRequests equals V4", async () => {
    const x = await filedWeek(memberX, project, { requestApproval: true });
    await filedWeek(memberY, project, { requestApproval: true });
    await filedWeek(managerA, project, { requestApproval: true }); // their own
    let marks = await newMarks(managerA);
    let count = (await api.get("/api/review-desk/count").set(as(managerA))).body
      .data.count;
    expect(marks.reviewRequests).toBe(2);
    expect(count).toBe(2);

    await markSeen(managerA, x.report._id);
    marks = await newMarks(managerA);
    count = (await api.get("/api/review-desk/count").set(as(managerA))).body
      .data.count;
    expect(marks.reviewRequests).toBe(1);
    expect(count).toBe(1);
  });

  it("on a Sunday, last week still counts as 'this week' for zones behind UTC", async () => {
    const view = await filedWeek(memberX, project);
    vi.setSystemTime(new Date("2026-10-04T13:00:00.000Z")); // Sunday; Monday at UTC+14
    await sendBack(view.report._id, managerA);
    expect((await newMarks(memberX)).nav).toEqual({
      thisWeek: true,
      myReports: false,
    });
  });

  it("requires a session", async () => {
    const res = await api.get("/api/me/new");
    expect(res.status).toBe(401);
  });
});

describe("markers never reveal a private layer", () => {
  const actorOf = (user) => ({ id: user._id, role: user.role });

  it("a week thread on someone else's Draft never makes a row new for a manager", () => {
    // Not reachable through the API (week comments need a submitted week); the
    // predicate still ignores week threads the reader may not read.
    const report = {
      author: memberX._id,
      status: "draft",
      interactionAt: new Date("2026-10-02T12:00:00Z"),
      days: [],
      weekComments: [
        {
          author: memberY._id,
          createdAt: new Date("2026-10-02T12:00:00Z"),
          replies: [
            {
              author: managerA._id,
              createdAt: new Date("2026-10-02T11:00:00Z"),
            },
          ],
        },
      ],
    };
    expect(isReportNew(actorOf(managerA), report, null)).toBe(false);
    expect(isReportNew(actorOf(memberX), report, null)).toBe(true);
  });

  it("a thread is new only for someone it concerns, and only for others' entries", () => {
    const report = { author: memberX._id };
    const thread = {
      author: managerA._id,
      createdAt: new Date("2026-10-02T12:00:00Z"),
      replies: [],
    };
    const before = new Date("2026-10-02T11:00:00Z");
    const after = new Date("2026-10-02T13:00:00Z");
    expect(isThreadNew(actorOf(memberX), report, thread, before)).toBe(true);
    expect(isThreadNew(actorOf(memberX), report, thread, after)).toBe(false);
    expect(isThreadNew(actorOf(managerA), report, thread, null)).toBe(false);
    expect(isThreadNew(actorOf(memberY), report, thread, null)).toBe(false);
  });

  it("rows a teammate sees in R12 carry nothing from the week's comments", async () => {
    const view = await filedWeek(memberX, project);
    await commentOnWeek(managerA, view.report._id, "PRIVATE-WEEK");
    const entry = await feedEntry(memberY, memberX);
    expect(JSON.stringify(entry)).not.toContain("PRIVATE-WEEK");
    const stored = await Report.findById(view.report._id).lean();
    expect(stored.weekComments).toHaveLength(1);
  });
});
