import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import * as reportService from "../../services/reportService.js";
import { apiClient } from "../../services/apiClient.js";
import { addWeeks } from "../../lib/dates.js";
import { createDemoAdapter } from "../demoAdapter.js";
import { createDemoStore } from "../demoStore.js";
import { PERSPECTIVES } from "../fixtures.js";

// The end-of-week content and the submit in the demo (api_specification.md §2.5 R6,
// R7), with the server's order of checks and its codes, so the weekly form's quiet
// autosave, its 422 mapping and its 409 all run in the demo too. Frozen on a Wednesday.

const THIS = "2026-W41";
const LAST = addWeeks(THIS, -1);
let store;

const as = (role) => {
  store.session.userId = PERSPECTIVES[role];
};
const failure = (promise) =>
  promise.then(
    () => null,
    (error) => ({
      code: error.code,
      fields: error.fields,
      details: error.details,
    }),
  );
const reportOf = (role, weekKey) =>
  store.reports.find(
    (r) => r.author === PERSPECTIVES[role] && r.weekKey === weekKey,
  );

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 7, 10, 0));
});
afterAll(() => vi.useRealTimers());

beforeEach(() => {
  store = createDemoStore();
  apiClient.defaults.adapter = createDemoAdapter(store, { latency: 0 });
  as("member");
});

describe("autosave (R6)", () => {
  it("stores statuses, notes, lists and the key blocker, and answers with the WeekView", async () => {
    const draft = reportOf("member", THIS);
    const [t1, t2] = draft.content.tasks.map((t) => t.taskId);
    const blocker = draft.days[0].blockers[0]._id;
    const view = await reportService.saveContent(draft._id, {
      tasks: [
        { task: t1, status: "in_progress", note: "  Halfway  " },
        { task: t2, status: "done" },
      ],
      nextWeek: ["Shipping", ""],
      achievements: [{ text: "Basket rebuilt", isKey: true }, { text: "" }],
      notes: "Notes",
      links: [{ label: "Spec", url: "https://example.com/spec" }],
      keyBlockerId: blocker,
    });
    expect(view.report.tasks.map((t) => [t.status, t.note])).toEqual([
      ["in_progress", "Halfway"],
      ["done", ""],
    ]);
    expect(view.report.content.nextWeek).toEqual(["Shipping"]);
    expect(view.report.content.achievements).toHaveLength(1);
    expect(view.report.content.achievements[0]._id).toMatch(/^[0-9a-f]{24}$/);
    expect(view.report.content.links).toEqual([
      { label: "Spec", url: "https://example.com/spec" },
    ]);
    const key = view.report.days
      .flatMap((d) => d.blockers)
      .find((b) => b.isKey);
    expect(key._id).toBe(blocker);
    expect(view.report.updatedAt).not.toBeNull();
    // Clearing the key blocker clears it everywhere.
    const cleared = await reportService.saveContent(draft._id, {
      keyBlockerId: null,
    });
    expect(
      cleared.report.days.flatMap((d) => d.blockers).some((b) => b.isKey),
    ).toBe(false);
  });

  it("a field left out is left alone", async () => {
    const draft = reportOf("member", THIS);
    await reportService.saveContent(draft._id, { notes: "First" });
    const view = await reportService.saveContent(draft._id, {
      nextWeek: ["Later"],
    });
    expect(view.report.content.notes).toBe("First");
  });

  it("refuses what the server refuses", async () => {
    const draft = reportOf("member", THIS);
    const other = reportOf("member", addWeeks(THIS, -2)); // approved
    expect(
      await failure(
        reportService.saveContent(draft._id, {
          tasks: [{ task: "0".repeat(24), status: "done" }],
        }),
      ),
    ).toMatchObject({
      code: "VALIDATION_FAILED",
      fields: { "tasks.0.task": "That task isn't in this week." },
    });
    expect(
      await failure(
        reportService.saveContent(draft._id, {
          links: [{ label: "x", url: "example.com" }],
        }),
      ),
    ).toMatchObject({ code: "VALIDATION_FAILED" });
    expect(
      await failure(reportService.saveContent(other._id, { notes: "x" })),
    ).toMatchObject({
      code: "REPORT_STATE_CHANGED",
      details: { status: "approved" },
    });
    as("manager");
    expect(
      await failure(reportService.saveContent(draft._id, { notes: "x" })),
    ).toMatchObject({ code: "REPORT_FORBIDDEN" });
  });
});

describe("submit (R7)", () => {
  it("resubmits a sent-back report: Submitted, a new revision, approval as asked", async () => {
    const report = reportOf("member", LAST);
    const view = await reportService.submitReport(report._id, {
      requestApproval: true,
    });
    expect(view.report.status).toBe("submitted");
    expect(view.report.revisionNumber).toBe(2);
    expect(view.report.approvalRequested).toBe(true);
    expect(view.report.latestComment).toBeNull();
    expect(view.state).toBe("submitted");
    const revisions = await reportService.listRevisions(report._id);
    expect(revisions.items.map((r) => r.revisionNumber)).toEqual([2, 1]);
    expect(revisions.items[0].isCurrent).toBe(true);
    // Once filed, a second submit is a 409 naming the status.
    expect(
      await failure(
        reportService.submitReport(report._id, { requestApproval: false }),
      ),
    ).toMatchObject({
      code: "REPORT_STATE_CHANGED",
      details: { status: "submitted" },
    });
  });

  it("without the tick, the report is complete once submitted", async () => {
    const report = reportOf("member", LAST);
    const view = await reportService.submitReport(report._id, {
      requestApproval: false,
    });
    expect(view.report.approvalRequested).toBe(false);
  });

  it("refuses with the submit rules' fields: missing days and tasks without a status", async () => {
    const draft = reportOf("member", THIS);
    const result = await failure(
      reportService.submitReport(draft._id, { requestApproval: false }),
    );
    expect(result.code).toBe("VALIDATION_FAILED");
    expect(result.fields["days.thu"]).toBe("Thursday has no update.");
    expect(result.fields["days.fri"]).toBe("Friday has no update.");
    for (const t of draft.content.tasks) {
      expect(result.fields[`tasks.${t.taskId}.status`]).toBe(
        "Choose a status.",
      );
    }
    expect(draft.status).toBe("draft");
  });

  it("someone else's report is REPORT_FORBIDDEN", async () => {
    const report = reportOf("member", LAST);
    as("manager");
    expect(
      await failure(
        reportService.submitReport(report._id, { requestApproval: false }),
      ),
    ).toMatchObject({ code: "REPORT_FORBIDDEN" });
  });
});
