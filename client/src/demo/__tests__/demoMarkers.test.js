import { beforeEach, describe, expect, it } from "vitest";
import { apiClient } from "../../services/apiClient.js";
import * as markerService from "../../services/markerService.js";
import * as reportService from "../../services/reportService.js";
import * as reviewService from "../../services/reviewService.js";
import { addWeeks, currentWeekKey } from "../../lib/dates.js";
import { createDemoAdapter } from "../demoAdapter.js";
import { createDemoStore } from "../demoStore.js";
import { PERSPECTIVES } from "../fixtures.js";

// The sidebar's markers in the demo (api_specification.md §2.10 N1, §2.7 V4): the same
// rules as the server's markerService, so the dots and the count behave in the demo as in
// the product. The cast: Imali's last week was sent back by Nadia and she hasn't opened it;
// Nadia's last week is Submitted without asking for approval.

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

beforeEach(() => {
  store = createDemoStore(undefined, { team: false });
  apiClient.defaults.adapter = createDemoAdapter(store, { latency: 0 });
});

describe("the sidebar's dots (N1)", () => {
  it("lights My reports for a week that was sent back, until it is opened", async () => {
    as("member");
    expect((await markerService.getNewMarks()).nav).toEqual({
      thisWeek: false,
      myReports: true,
    });
    await reportService.markSeen(reportOf("member", LAST)._id);
    expect((await markerService.getNewMarks()).nav.myReports).toBe(false);
  });

  it("lights This week when the current week has something new, not My reports", async () => {
    as("member");
    const report = reportOf("member", THIS);
    report.status = "approved";
    report.lastActivityAt = new Date().toISOString();
    await reportService.markSeen(reportOf("member", LAST)._id);
    expect((await markerService.getNewMarks()).nav).toEqual({
      thisWeek: true,
      myReports: false,
    });
    await reportService.markSeen(report._id);
    expect((await markerService.getNewMarks()).nav.thisWeek).toBe(false);
  });

  it("never marks a week for what the reader did themselves", async () => {
    as("manager");
    // Nadia's own submitted report: her submission is not news to her.
    expect((await markerService.getNewMarks()).nav).toEqual({
      thisWeek: false,
      myReports: false,
    });
  });

  it("rows of the history list agree with the dot", async () => {
    as("member");
    const rows = (await reportService.listMyReports({})).items;
    expect(rows.find((r) => r.weekKey === LAST).isNew).toBe(true);
    await reportService.markSeen(reportOf("member", LAST)._id);
    const after = (await reportService.listMyReports({})).items;
    expect(after.find((r) => r.weekKey === LAST).isNew).toBe(false);
  });
});

describe("the review desk's count (V4)", () => {
  it("counts requests the manager hasn't opened since the latest submission", async () => {
    as("admin");
    expect((await reviewService.getReviewDeskCount()).count).toBe(0);
    const report = reportOf("manager", LAST);
    report.approvalRequested = true;
    expect((await reviewService.getReviewDeskCount()).count).toBe(1);
    expect((await markerService.getNewMarks()).reviewRequests).toBe(1);

    await reportService.markSeen(report._id);
    expect((await reviewService.getReviewDeskCount()).count).toBe(0);

    // A new submission after the mark is new again.
    report.submittedAt = new Date(Date.now() + 1000).toISOString();
    expect((await reviewService.getReviewDeskCount()).count).toBe(1);
  });

  it("never counts your own report", async () => {
    as("manager");
    reportOf("manager", LAST).approvalRequested = true;
    expect((await reviewService.getReviewDeskCount()).count).toBe(0);
  });

  it("is a manager's: a member is refused, and N1 says zero to them", async () => {
    as("member");
    const error = await failure(reviewService.getReviewDeskCount());
    expect(error.code).toBe("FORBIDDEN");
    expect((await markerService.getNewMarks()).reviewRequests).toBe(0);
  });
});
