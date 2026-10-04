import { expect, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { Report } from "../../src/models/reportModel.js";
import { bearer } from "./testAuth.js";

// Shared by the report suites: a frozen clock, day bodies, the week's writes as the
// author makes them, and (S5) the review and comment calls. Week 2026-W40 runs Mon 28 Sep – Fri 2 Oct 2026.

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
  { status = "done", note = "", week = WEEK, requestApproval = false } = {},
) {
  const view = await postWeek(user, project, DAYS, week);
  const reportId = view.report._id;
  const tasks = view.report.tasks.map((t) => ({
    task: t.task._id,
    status,
    note,
  }));
  expect(
    (await autosave(user, reportId, { tasks, notes: "Week notes" })).status,
  ).toBe(200);
  const res = await submit(user, reportId, requestApproval);
  expect(res.status).toBe(200);
  return res.body.data;
}

/** V2 as `reviewer`, pinned to the report's current revision. Returns the response. */
export async function sendBack(
  reportId,
  reviewer,
  comment = "Hours by type look off.",
) {
  const report = await Report.findById(reportId).lean();
  const res = await api
    .post(`/api/reports/${reportId}/review/send-back`)
    .set(as(reviewer))
    .send({ revisionNumber: report.revisionNumber, comment });
  expect(res.status).toBe(200);
  return res;
}

/** V1 as `reviewer`; `revisionNumber` defaults to the report's current one. */
export async function approve(reportId, reviewer, body = {}) {
  const report = await Report.findById(reportId).lean();
  return api
    .post(`/api/reports/${reportId}/review/approve`)
    .set(as(reviewer))
    .send({ revisionNumber: report.revisionNumber, ...body });
}

// ---------------------------------------------------------------- comments (C1–C5)

export const commentOnDay = (user, reportId, weekday, text) =>
  api
    .post(`/api/reports/${reportId}/days/${weekday}/comments`)
    .set(as(user))
    .send({ text });

export const commentOnWeek = (user, reportId, text) =>
  api
    .post(`/api/reports/${reportId}/week-comments`)
    .set(as(user))
    .send({ text });

export const reply = (user, reportId, threadId, text) =>
  api
    .post(`/api/reports/${reportId}/threads/${threadId}/replies`)
    .set(as(user))
    .send({ text });

const commentPath = (reportId, threadId, replyId) =>
  `/api/reports/${reportId}/threads/${threadId}` +
  (replyId ? `/replies/${replyId}` : "");

export const editComment = (user, reportId, threadId, text, replyId) =>
  api
    .patch(commentPath(reportId, threadId, replyId))
    .set(as(user))
    .send({ text });

export const deleteComment = (user, reportId, threadId, replyId) =>
  api.delete(commentPath(reportId, threadId, replyId)).set(as(user));

export const markSeen = (user, reportId) =>
  api.post(`/api/reports/${reportId}/seen`).set(as(user));
