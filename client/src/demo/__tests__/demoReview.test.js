import { beforeEach, describe, expect, it } from "vitest";
import { apiClient } from "../../services/apiClient.js";
import * as reportService from "../../services/reportService.js";
import * as reviewService from "../../services/reviewService.js";
import * as userService from "../../services/userService.js";
import {
  addWeeks,
  currentWeekKey,
  toCalendarDate,
  weekDays,
} from "../../lib/dates.js";
import { createDemoAdapter } from "../demoAdapter.js";
import { createDemoStore } from "../demoStore.js";
import { PERSPECTIVES } from "../fixtures.js";

// The demo applies the server's rules for the team feed, the review desk and the two
// decisions (api_specification.md §2.5 R12, §2.7 V1–V3), so the review page's refusals —
// your own report, a stale version, a 9-character send-back — run in it too. The cast:
// Nadia (manager) has last week's report Submitted; Sanduni (admin) reviews it.

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

const THIS = currentWeekKey();
const LAST = addWeeks(THIS, -1);
const long = "Thursday testing is missing from the notes.";

beforeEach(() => {
  store = createDemoStore();
  apiClient.defaults.adapter = createDemoAdapter(store, { latency: 0 });
  as("admin");
});

describe("the review desk (V3)", () => {
  it("lists what asked for approval, and `all` adds what didn't", async () => {
    expect((await reviewService.listReviewDesk({})).items).toEqual([]);
    const all = await reviewService.listReviewDesk({ approval: "all" });
    expect(all.items.map((r) => r.author.name)).toEqual(["Nadia F."]);
    expect(all.items[0]).toMatchObject({
      status: "submitted",
      approvalRequested: false,
      revisionNumber: 1,
      weekKey: LAST,
    });

    reportOf("manager", LAST).approvalRequested = true;
    const asked = await reviewService.listReviewDesk({});
    expect(asked.items.map((r) => r._id)).toEqual([
      reportOf("manager", LAST)._id,
    ]);
    expect(asked.items[0].isNew).toBe(true);
    expect(asked.meta).toMatchObject({ page: 1, limit: 20, total: 1 });
  });

  it("never lists the caller's own report, under any filter", async () => {
    as("manager");
    reportOf("manager", LAST).approvalRequested = true;
    const own = PERSPECTIVES.manager;
    for (const params of [
      {},
      { approval: "all" },
      { person: own, approval: "all" },
      { role: "manager", approval: "all" },
      { weekFrom: LAST, weekTo: LAST, approval: "all" },
    ]) {
      expect((await reviewService.listReviewDesk(params)).items).toEqual([]);
    }
  });

  it("filters by person, role, project and week range", async () => {
    const page = (params) =>
      reviewService.listReviewDesk({ approval: "all", ...params });
    expect((await page({ person: PERSPECTIVES.manager })).meta.total).toBe(1);
    expect((await page({ person: PERSPECTIVES.member })).meta.total).toBe(0);
    expect((await page({ role: "member" })).meta.total).toBe(0);
    expect((await page({ role: "member,manager" })).meta.total).toBe(1);
    const rnd = store.projects.find((p) => p.name === "R&D")._id;
    const clientA = store.projects.find((p) => p.name === "Client A")._id;
    expect((await page({ project: rnd })).meta.total).toBe(1);
    expect((await page({ project: clientA })).meta.total).toBe(0);
    expect((await page({ weekFrom: THIS })).meta.total).toBe(0);
    expect((await page({ weekTo: LAST })).meta.total).toBe(1);
  });

  it("refuses a member", async () => {
    as("member");
    expect((await failure(reviewService.listReviewDesk({}))).code).toBe(
      "FORBIDDEN",
    );
  });
});

describe("approve and send back (V1, V2)", () => {
  it("approves a submitted report, with or without having asked", async () => {
    const report = reportOf("manager", LAST);
    const view = await reviewService.approve(report._id, {
      revisionNumber: 1,
      comment: "Good week.",
    });
    expect(view.report.status).toBe("approved");
    expect(view.report.weekComments.at(-1)).toMatchObject({
      text: "Good week.",
      kind: "approval",
      revisionNumber: 1,
    });
    expect(report.revisions[0]).toMatchObject({
      action: "approved",
      reviewedBy: PERSPECTIVES.admin,
    });
    // It leaves the desk.
    expect(
      (await reviewService.listReviewDesk({ approval: "all" })).items,
    ).toEqual([]);
  });

  it("approves without a comment and writes no thread", async () => {
    const report = reportOf("manager", LAST);
    await reviewService.approve(report._id, { revisionNumber: 1 });
    expect(report.weekComments).toEqual([]);
    expect(report.status).toBe("approved");
  });

  it("sends back with a comment of at least 10 characters, as the week's thread", async () => {
    const report = reportOf("manager", LAST);
    const short = await failure(
      reviewService.sendBack(report._id, {
        revisionNumber: 1,
        comment: "too short",
      }),
    );
    expect(short.code).toBe("VALIDATION_FAILED");
    expect(short.fields.comment).toBeTruthy();
    expect(report.status).toBe("submitted");

    const view = await reviewService.sendBack(report._id, {
      revisionNumber: 1,
      comment: long,
    });
    expect(view.report.status).toBe("needs_correction");
    expect(view.report.weekComments.at(-1)).toMatchObject({
      kind: "send_back",
      text: long,
    });
    expect(view.report.latestComment.text).toBe(long);
    expect(report.revisions[0].action).toBe("changes_requested");
  });

  it("refuses your own report, even a submitted one", async () => {
    as("manager");
    const error = await failure(
      reviewService.approve(reportOf("manager", LAST)._id, {
        revisionNumber: 1,
      }),
    );
    expect(error.code).toBe("SELF_REVIEW_FORBIDDEN");
    expect(error.httpStatus).toBe(403);
  });

  it("refuses a member, and a report that isn't submitted", async () => {
    as("member");
    const mine = reportOf("member", LAST); // sent back
    expect(
      (await failure(reviewService.approve(mine._id, { revisionNumber: 1 })))
        .code,
    ).toBe("FORBIDDEN");
    as("admin");
    const error = await failure(
      reviewService.approve(mine._id, { revisionNumber: 1 }),
    );
    expect(error.code).toBe("REPORT_STATE_CHANGED");
    expect(error.details).toEqual({ status: "needs_correction" });
  });

  it("pins the revision: a decision on a version that was replaced is refused", async () => {
    const report = reportOf("manager", LAST);
    // Sent back, corrected and resubmitted: now on version 2.
    await reviewService.sendBack(report._id, {
      revisionNumber: 1,
      comment: long,
    });
    as("manager");
    await reportService.submitReport(report._id, { requestApproval: true });
    expect(report.revisionNumber).toBe(2);

    as("admin");
    const stale = await failure(
      reviewService.approve(report._id, { revisionNumber: 1 }),
    );
    expect(stale.code).toBe("REPORT_STATE_CHANGED");
    expect(stale.details).toEqual({ status: "submitted" });
    expect(report.status).toBe("submitted");

    const view = await reviewService.approve(report._id, { revisionNumber: 2 });
    expect(view.report.status).toBe("approved");
    // And only one of two reviewers can decide the same version.
    const again = await failure(
      reviewService.approve(report._id, { revisionNumber: 2 }),
    );
    expect(again.code).toBe("REPORT_STATE_CHANGED");
  });
});

describe("the team feed (R12)", () => {
  const feed = (params) =>
    reportService.listTeamUpdates({ weekKey: LAST, weekday: "tue", ...params });

  it("lists everyone on the team, the viewer first, then by name", async () => {
    as("manager");
    const { items } = await feed();
    expect(items.map((e) => e.user.name)).toEqual([
      "Nadia F.",
      "Imali J.",
      "Sanduni B.",
    ]);
    expect(items.map((e) => e.state)).toEqual([
      "posted",
      "posted",
      "not_posted",
    ]);
    expect(items[2]).toMatchObject({ reportId: null, day: null });
    expect(items[0].day.lines.length).toBeGreaterThan(0);
    expect(items[0].reportId).toBe(reportOf("manager", LAST)._id);
  });

  it("serves a teammate the day with the thread's closed state, not the week", async () => {
    as("member");
    const { items } = await feed();
    const nadia = items.find((e) => e.user.name === "Nadia F.");
    expect(nadia.day.canComment).toBe(false);
    expect(nadia.day.weekday).toBe("tue");
  });

  it("filters by project and by blockers", async () => {
    const rnd = store.projects.find((p) => p.name === "R&D")._id;
    const clientA = store.projects.find((p) => p.name === "Client A")._id;
    // On Tuesday Imali worked on Client A and Nadia on R&D.
    expect(
      (await feed({ project: rnd })).items.map((e) => e.user.name),
    ).toEqual(["Nadia F."]);
    expect(
      (await feed({ project: clientA })).items.map((e) => e.user.name),
    ).toEqual(["Imali J."]);
    // Imali's Monday has a blocker; Nadia's Monday has none.
    const monday = await reportService.listTeamUpdates({
      weekKey: LAST,
      weekday: "mon",
      blockersOnly: true,
    });
    expect(monday.items.map((e) => e.user.name)).toEqual(["Imali J."]);
  });

  it("marks a person on leave and a holiday", async () => {
    const sanduni = store.users.find((u) => u._id === PERSPECTIVES.admin);
    const stateOf = async (params) =>
      (await feed(params)).items.find((e) => e.user.name === "Sanduni B.")
        .state;
    sanduni.onLeave = true;
    sanduni.leaveFrom = "2000-01-01";
    expect(await stateOf()).toBe("leave");
    store.holidays.push({
      _id: "h1",
      date: toCalendarDate(weekDays(LAST)[2].date),
      name: "Poya",
      createdBy: PERSPECTIVES.admin,
    });
    // A holiday wins over leave; people who posted that day still show as posted.
    expect(await stateOf({ weekday: "wed" })).toBe("holiday");
    expect(
      (await feed({ weekday: "wed" })).items.find(
        (e) => e.user.name === "Nadia F.",
      ).state,
    ).toBe("posted");
  });

  it("rejects a malformed request", async () => {
    expect((await failure(feed({ weekday: "sun" }))).code).toBe(
      "VALIDATION_FAILED",
    );
  });
});

describe("the people list (U1)", () => {
  it("serves managers and admins the whole team, sorted by name", async () => {
    const page = await userService.listUsers({ limit: 100 });
    expect(page.items.map((u) => u.name)).toEqual([
      "Imali J.",
      "Nadia F.",
      "Sanduni B.",
    ]);
    expect(page.items[0]).toMatchObject({
      role: "member",
      status: "active",
      reportsFiled: 2,
    });
    expect(page.meta.total).toBe(3);
    expect(
      (await userService.listUsers({ role: "manager", limit: 20 })).items.map(
        (u) => u.name,
      ),
    ).toEqual(["Nadia F."]);
    expect(
      (await userService.listUsers({ q: "sand", limit: 20 })).meta.total,
    ).toBe(1);
  });

  it("carries no link token, ever", async () => {
    const page = await userService.listUsers({ limit: 100 });
    expect(JSON.stringify(page)).not.toMatch(/token|linkUrl/i);
  });
});
