import { expect, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { Report } from "../../src/models/reportModel.js";
import { Revision } from "../../src/models/revisionModel.js";
import { bearer } from "./testAuth.js";

// Shared by the S4 report suites: a frozen clock, day bodies, and the week's writes as
// the author makes them. Week 2026-W40 runs Mon 28 Sep – Fri 2 Oct 2026.

export const api = request(app);
export const WEEK = "2026-W40";
export const DAYS = ["mon", "tue", "wed", "thu", "fri"];
export const as = (user) => ({ Authorization: bearer(user) });

/** Freezes Date (only) at `time` UTC, e.g. "2026-10-02T12:00:00". */
export function freezeAt(time) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${time}.000Z`));
}

/** A day body with one line on `task` (an id) or a new task on `project`. */
export function dayBody({
  task,
  project,
  hours = 4,
  blockers = [],
  openToTeam = false,
}) {
  const idOf = (x) => String(x?._id ?? x);
  const line = task
    ? { task: idOf(task) }
    : { newTask: { name: "Checkout redesign", project: idOf(project) } };
  return {
    lines: [{ ...line, taskType: "development", text: "Worked on it", hours }],
    blockers,
    openToTeam,
  };
}

export const putDay = (user, weekday, body, week = WEEK) =>
  api.put(`/api/reports/week/${week}/days/${weekday}`).set(as(user)).send(body);

/** Posts every weekday in `days` on one new task; returns the last WeekView. */
export async function postWeek(user, project, days = DAYS, week = WEEK) {
  let res = await putDay(user, days[0], dayBody({ project }), week);
  expect(res.status).toBe(200);
  const taskId = res.body.data.report.days[0].lines[0].task._id;
  for (const day of days.slice(1)) {
    res = await putDay(user, day, dayBody({ task: taskId }), week);
    expect(res.status).toBe(200);
  }
  return res.body.data;
}

export const autosave = (user, reportId, body) =>
  api.patch(`/api/reports/${reportId}`).set(as(user)).send(body);

export const submit = (user, reportId, requestApproval = false) =>
  api
    .post(`/api/reports/${reportId}/submit`)
    .set(as(user))
    .send({ requestApproval });

/** Five days, every task given `status`, submitted. Returns the WeekView. */
export async function filedWeek(
  user,
  project,
  { status = "done", note = "" } = {},
) {
  const view = await postWeek(user, project);
  const reportId = view.report._id;
  const tasks = view.report.tasks.map((t) => ({
    task: t.task._id,
    status,
    note,
  }));
  expect(
    (await autosave(user, reportId, { tasks, notes: "Week notes" })).status,
  ).toBe(200);
  const res = await submit(user, reportId);
  expect(res.status).toBe(200);
  return res.body.data;
}

/**
 * The send-back's writes (database_schema.md §3.3), straight to the database until V2
 * exists (S5): claim the current revision, then the report.
 */
export async function sendBack(
  reportId,
  reviewer,
  comment = "Hours by type look off.",
) {
  const report = await Report.findById(reportId).lean();
  const now = new Date();
  await Revision.updateOne(
    { report: report._id, revisionNumber: report.revisionNumber, action: null },
    {
      $set: {
        action: "changes_requested",
        comment,
        reviewedBy: reviewer._id,
        reviewedAt: now,
      },
    },
  );
  await Report.updateOne(
    { _id: report._id },
    {
      $set: {
        status: "needs_correction",
        lastActivityAt: now,
        interactionAt: now,
        latestComment: {
          text: comment,
          author: reviewer._id,
          revisionNumber: report.revisionNumber,
          createdAt: now,
        },
      },
      $push: {
        weekComments: {
          author: reviewer._id,
          text: comment,
          createdAt: now,
          revisionNumber: report.revisionNumber,
          kind: "send_back",
        },
      },
    },
  );
}
