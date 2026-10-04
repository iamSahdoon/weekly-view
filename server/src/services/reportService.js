import mongoose from "mongoose";
import { TASK_TYPES } from "../constants/taskTypes.js";
import { WEEKDAYS } from "../constants/weekdays.js";
import { Project } from "../models/projectModel.js";
import { Report } from "../models/reportModel.js";
import { Revision } from "../models/revisionModel.js";
import { Task } from "../models/taskModel.js";
import { User } from "../models/userModel.js";
import {
  EDIT_WINDOW_MS,
  OPEN_STATUSES,
  canOpenWeek,
  canReadContent,
  canCommentOnDay,
  canResolveBlocker,
  canToggleTeamComments,
  contentSourceFor,
  isAuthor,
} from "../policies/reportPolicy.js";
import { checkSubmit } from "../policies/submitRules.js";
import { AppError } from "../utils/appError.js";
import { pageWindow, paginated } from "../utils/paginate.js";
import {
  shiftWeek,
  toDateString,
  weekEndOf,
  weekKeyOf,
  weekStartOf,
  weekdayDate,
} from "../utils/weeks.js";
import * as calendar from "./calendarService.js";
import * as markerService from "./markerService.js";
import * as taskService from "./taskService.js";
import { userRef } from "./userService.js";

// The author writing their own week — days, autosave, submit, revisions — and every
// report read, including the team updates feed; also blocker resolutions and the
// team-comment switch (project_structure.md §2.5). Load, then authorize (tech_stack.md
// §3.1). Nothing withheld is ever serialized: a withheld layer is null.

const BOUND_MS = 14 * 60 * 60 * 1000;
const NAME_ORDER = { sensitivity: "base" };

const oid = (id) => new mongoose.Types.ObjectId(String(id));
const sameId = (a, b) => String(a) === String(b);

// ---------------------------------------------------------------- errors

const reportNotFound = () =>
  new AppError(404, "That report doesn't exist.", "REPORT_NOT_FOUND");
const reportForbidden = () =>
  new AppError(
    403,
    "You don't have access to this report.",
    "REPORT_FORBIDDEN",
  );
const userNotFound = () =>
  new AppError(404, "That person doesn't exist.", "USER_NOT_FOUND");
const stateChanged = (status) =>
  new AppError(
    409,
    "This week has changed. Refresh and try again.",
    "REPORT_STATE_CHANGED",
    { status },
  );
const validationFailed = (fields) =>
  new AppError(422, "Some fields need attention.", "VALIDATION_FAILED", {
    fields,
  });

// ---------------------------------------------------------------- the clock (I2)

// "Current" is bounded at now + 14h, the latest calendar date anywhere (UTC+14); dates
// are compared in UTC (api_specification.md I2, O4). Both err towards allowing.
const boundDate = (now) =>
  calendar.todayUtc(new Date(now.getTime() + BOUND_MS));
const currentWeekKey = (now) => weekKeyOf(boundDate(now));

async function holidaysOfWeek(weekKey) {
  return calendar.holidaySet(weekStartOf(weekKey), weekEndOf(weekKey));
}

// ---------------------------------------------------------------- loading

async function loadReport(reportId) {
  const report = await Report.findById(reportId).lean();
  if (!report) throw reportNotFound();
  return report;
}

/** R4, R8–R11, R13: load, then the week must be one the actor may open. */
async function loadOpenable(actor, reportId) {
  const report = await loadReport(reportId);
  if (!canOpenWeek(actor, report)) throw reportForbidden();
  return report;
}

/** R6, R7: load, the author only, the week open. */
async function loadForAuthorWrite(actor, reportId) {
  const report = await loadReport(reportId);
  if (!isAuthor(actor, report)) throw reportForbidden();
  if (!OPEN_STATUSES.includes(report.status)) throw stateChanged(report.status);
  return report;
}

async function currentStatus(reportId) {
  const report = await Report.findById(reportId).select("status").lean();
  return report?.status ?? null;
}

const USER_FIELDS = "name role status leave workPeriods";

async function usersById(ids) {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  if (unique.length === 0) return new Map();
  const users = await User.find({ _id: { $in: unique } })
    .select("name role status leave")
    .lean();
  return new Map(users.map((u) => [String(u._id), userRef(u)]));
}

const projectRef = (p) => p && { _id: p._id, name: p.name, status: p.status };

async function taskRefsById(ids) {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  if (unique.length === 0) return new Map();
  const tasks = await Task.find({ _id: { $in: unique } })
    .select("name project")
    .populate("project", "name status")
    .lean();
  return new Map(
    tasks.map((t) => [
      String(t._id),
      { _id: t._id, name: t.name, project: projectRef(t.project) },
    ]),
  );
}

// ---------------------------------------------------------------- derived values

const sortedDays = (days = []) =>
  [...days].sort(
    (a, b) => WEEKDAYS.indexOf(a.weekday) - WEEKDAYS.indexOf(b.weekday),
  );

const linesOf = (report) => (report.days ?? []).flatMap((d) => d.lines ?? []);
const blockersOf = (report) =>
  (report.days ?? []).flatMap((d) => d.blockers ?? []);
const sumHours = (lines) => lines.reduce((sum, l) => sum + l.hours, 0);

function hoursByTypeOf(report) {
  const totals = Object.fromEntries(TASK_TYPES.map((t) => [t, 0]));
  for (const line of linesOf(report)) totals[line.taskType] += line.hours;
  return totals;
}

function hoursByTaskOf(report) {
  const totals = new Map();
  for (const line of linesOf(report)) {
    const key = String(line.task);
    totals.set(key, (totals.get(key) ?? 0) + line.hours);
  }
  return totals;
}

// Carried over (database_schema.md §3.5): the same normalised text among the author's
// blockers the week before.
const normalise = (text) => text.trim().replace(/\s+/g, " ").toLowerCase();

/** For each report, the normalised blocker texts of its author's previous week. */
async function previousBlockerTexts(reports) {
  const result = new Map(reports.map((r) => [String(r._id), new Set()]));
  if (reports.length === 0) return result;
  const previous = await Report.find({
    $or: reports.map((r) => ({
      author: r.author,
      weekKey: shiftWeek(r.weekKey, -1),
    })),
  })
    .select("author weekKey days.blockers.text")
    .lean();
  const byAuthorWeek = new Map(
    previous.map((p) => [
      `${p.author}|${p.weekKey}`,
      new Set(blockersOf(p).map((b) => normalise(b.text))),
    ]),
  );
  for (const r of reports) {
    const texts = byAuthorWeek.get(`${r.author}|${shiftWeek(r.weekKey, -1)}`);
    if (texts) result.set(String(r._id), texts);
  }
  return result;
}

// ---------------------------------------------------------------- shapes (§1.10)

function threadOut(thread, users, { weekThread, isNew }) {
  const reply = (r) => ({
    _id: r._id,
    author: users.get(String(r.author)) ?? null,
    text: r.text,
    createdAt: r.createdAt,
    editedAt: r.editedAt ?? null,
    editableUntil: new Date(new Date(r.createdAt).getTime() + EDIT_WINDOW_MS),
  });
  return {
    ...reply(thread),
    revisionNumber: weekThread ? (thread.revisionNumber ?? null) : null,
    kind: weekThread ? (thread.kind ?? "comment") : null,
    replies: (thread.replies ?? []).map(reply),
    isNew,
  };
}

const threadAuthors = (threads = []) =>
  threads.flatMap((t) => [t.author, ...(t.replies ?? []).map((r) => r.author)]);

/**
 * What serializing days for `actor` needs, for any number of reports in one round of
 * queries: people, tasks, each report's previous-week blocker texts, and the actor's
 * seen marks (for `isNew`).
 */
async function dayContext(
  actor,
  reports,
  { extraUserIds = [], extraTaskIds = [] } = {},
) {
  const userIds = [...extraUserIds];
  const taskIds = [...extraTaskIds];
  for (const r of reports) {
    userIds.push(r.author);
    for (const d of r.days ?? []) userIds.push(...threadAuthors(d.comments));
    for (const res of r.blockerResolutions ?? []) userIds.push(res.resolvedBy);
    taskIds.push(...linesOf(r).map((l) => l.task));
  }
  const [users, tasks, carried, seen] = await Promise.all([
    usersById(userIds),
    taskRefsById(taskIds),
    previousBlockerTexts(reports),
    markerService.seenAtByReport(
      actor,
      reports.map((r) => r._id),
    ),
  ]);
  return { users, tasks, carried, seen };
}

/** A thread of `report` as `actor` reads it, with its "new" marker. */
function threadFor(actor, report, thread, ctx, { weekThread }) {
  return threadOut(thread, ctx.users, {
    weekThread,
    isNew: markerService.isThreadNew(
      actor,
      report,
      thread,
      ctx.seen.get(String(report._id)),
    ),
  });
}

function lineOut(line, tasks) {
  return {
    _id: line._id,
    task: tasks.get(String(line.task)) ?? null,
    taskType: line.taskType,
    text: line.text,
    hours: line.hours,
  };
}

/** A `Day` for `actor`: lines, blockers with resolution and carried-over, comments. */
function dayOut(actor, report, day, ctx) {
  const resolutions = new Map(
    (report.blockerResolutions ?? []).map((r) => [String(r.blockerId), r]),
  );
  const carried = ctx.carried.get(String(report._id)) ?? new Set();
  return {
    weekday: day.weekday,
    lines: (day.lines ?? []).map((l) => lineOut(l, ctx.tasks)),
    blockers: (day.blockers ?? []).map((b) => {
      const resolution = resolutions.get(String(b._id));
      return {
        _id: b._id,
        text: b.text,
        isKey: !!b.isKey,
        resolvedAt: resolution?.resolvedAt ?? null,
        resolvedBy: resolution
          ? (ctx.users.get(String(resolution.resolvedBy)) ?? null)
          : null,
        carriedOver: carried.has(normalise(b.text)),
      };
    }),
    openToTeam: !!day.openToTeam,
    postedAt: day.postedAt ?? null,
    editedAt: day.editedAt ?? null,
    hours: sumHours(day.lines ?? []),
    comments: (day.comments ?? []).map((t) =>
      threadFor(actor, report, t, ctx, { weekThread: false }),
    ),
    canComment: canCommentOnDay(actor, report, day),
  };
}

/** The served end-of-week content (I13): live, the current revision's, or null. */
async function servedContent(actor, report) {
  const source = contentSourceFor(actor, report);
  if (source === "withheld")
    return { source, content: null, revisionNumber: null };
  if (source === "live") {
    return { source, content: report.content ?? {}, revisionNumber: null };
  }
  const revision = await Revision.findOne({
    report: report._id,
    revisionNumber: report.revisionNumber,
  })
    .select("content")
    .lean();
  return {
    source,
    content: revision?.content ?? null,
    revisionNumber: report.revisionNumber,
  };
}

const contentBody = (content) => ({
  nextWeek: content.nextWeek ?? [],
  achievements: (content.achievements ?? []).map((a) => ({
    _id: a._id,
    text: a.text,
    isKey: !!a.isKey,
  })),
  notes: content.notes ?? "",
  links: (content.links ?? []).map((l) => ({
    label: l.label ?? "",
    url: l.url,
  })),
});

/** The `Report` inside a WeekView, with the layers of I15 applied for `actor`. */
async function reportOut(actor, report, { expectedDays }) {
  const readable = canReadContent(actor, report);
  const served = await servedContent(actor, report);
  const servedTasks = new Map(
    (served.content?.tasks ?? []).map((t) => [String(t.task), t]),
  );
  const liveTasks = report.content?.tasks ?? [];
  const ctx = await dayContext(actor, [report], {
    extraUserIds: readable
      ? [...threadAuthors(report.weekComments), report.latestComment?.author]
      : [],
    extraTaskIds: liveTasks.map((t) => t.task),
  });
  const hoursByTask = hoursByTaskOf(report);
  const author = isAuthor(actor, report);
  const open = OPEN_STATUSES.includes(report.status);
  const rules = author
    ? checkSubmit({
        expectedDays,
        postedDays: (report.days ?? []).map((d) => d.weekday),
        tasks: liveTasks,
      })
    : null;

  return {
    _id: report._id,
    author: ctx.users.get(String(report.author)) ?? null,
    weekKey: report.weekKey,
    weekStart: toDateString(report.weekStart),
    weekEnd: toDateString(report.weekEnd),
    status: report.status,
    approvalRequested: !!report.approvalRequested,
    revisionNumber: report.revisionNumber,
    submittedAt: report.submittedAt ?? null,
    lastActivityAt: report.lastActivityAt ?? null,
    updatedAt: report.updatedAt ?? null,
    days: sortedDays(report.days).map((d) => dayOut(actor, report, d, ctx)),
    // The rows follow the live lines; status and note come from the served content.
    tasks: liveTasks.map((t) => {
      const entry = servedTasks.get(String(t.task));
      return {
        task: ctx.tasks.get(String(t.task)) ?? null,
        hours: hoursByTask.get(String(t.task)) ?? 0,
        status: served.content ? (entry?.status ?? null) : null,
        note: served.content ? (entry?.note ?? null) : null,
      };
    }),
    hoursByType: hoursByTypeOf(report),
    contentSource: served.content ? served.source : "withheld",
    contentRevisionNumber: served.content ? served.revisionNumber : null,
    content: served.content ? contentBody(served.content) : null,
    weekComments: readable
      ? (report.weekComments ?? []).map((t) =>
          threadFor(actor, report, t, ctx, { weekThread: true }),
        )
      : null,
    latestComment:
      readable && report.latestComment
        ? {
            text: report.latestComment.text,
            author: ctx.users.get(String(report.latestComment.author)) ?? null,
            revisionNumber: report.latestComment.revisionNumber,
            createdAt: report.latestComment.createdAt,
          }
        : null,
    canSubmit: author ? open && rules.ok : null,
    submitBlockers: author ? (open ? rules.messages : []) : null,
  };
}

/** `dayStates` (§1.10). Today and future are judged on the server's clock (I2). */
function dayStatesOf(user, weekKey, holidays, report, now) {
  const posted = new Set((report?.days ?? []).map((d) => d.weekday));
  const today = toDateString(calendar.todayUtc(now));
  const bound = toDateString(boundDate(now));
  return Object.fromEntries(
    WEEKDAYS.map((day) => {
      if (posted.has(day)) return [day, "posted"];
      const availability = calendar.dayAvailability(
        user,
        weekKey,
        day,
        holidays,
      );
      if (availability !== "expected") return [day, availability];
      const date = toDateString(weekdayDate(weekKey, day));
      if (date > bound) return [day, "future"];
      return [day, date >= today ? "today" : "missing"];
    }),
  );
}

/** The `WeekView` of `user`'s week for `actor`. `report` may be null (I3). */
async function weekView(actor, user, weekKey, report, now = new Date()) {
  const holidays = await holidaysOfWeek(weekKey);
  const workingDays = calendar.workingDaysIn(weekKey, holidays);
  const expectedDays = calendar.expectedDaysOf(user, weekKey, workingDays);
  // Outside the person's work periods, a week with no report is simply not started.
  const state =
    !report && !calendar.isOnTeamForWeek(user, weekKey)
      ? "not_started"
      : calendar.weekStateOf({ workingDays, expectedDays, report });
  return {
    user: userRef(user),
    weekKey,
    weekStart: toDateString(weekStartOf(weekKey)),
    weekEnd: toDateString(weekEndOf(weekKey)),
    expectedDays,
    dayStates: dayStatesOf(user, weekKey, holidays, report, now),
    state,
    report: report ? await reportOut(actor, report, { expectedDays }) : null,
  };
}

/** The WeekView of `report`'s week for `actor` — also V1 and V2's answer. */
export async function weekViewOf(actor, report) {
  const user = await User.findById(report.author).select(USER_FIELDS).lean();
  return weekView(actor, user, report.weekKey, report);
}

// ---------------------------------------------------------------- report rows (§1.10)

/** Content statuses a non-author reads on Needs correction: the sent-back revision's. */
async function revisionTasksFor(actor, reports) {
  const wanted = reports.filter(
    (r) => contentSourceFor(actor, r) === "revision",
  );
  if (wanted.length === 0) return new Map();
  const revisions = await Revision.find({
    $or: wanted.map((r) => ({
      report: r._id,
      revisionNumber: r.revisionNumber,
    })),
  })
    .select("report content.tasks")
    .lean();
  return new Map(
    revisions.map((v) => [String(v.report), v.content?.tasks ?? []]),
  );
}

async function reportRows(actor, reports) {
  const projectIds = reports.flatMap((r) => linesOf(r).map((l) => l.project));
  const [projects, revisionTasks, fresh] = await Promise.all([
    Project.find({ _id: { $in: [...new Set(projectIds.map(String))] } })
      .select("name status")
      .lean(),
    revisionTasksFor(actor, reports),
    markerService.newReportIds(
      actor,
      reports.map((r) => r._id),
    ),
  ]);
  const projectById = new Map(
    projects.map((p) => [String(p._id), projectRef(p)]),
  );
  return reports.map((r) => {
    const lines = linesOf(r);
    const source = contentSourceFor(actor, r);
    const servedTasks =
      source === "live"
        ? (r.content?.tasks ?? [])
        : source === "revision"
          ? (revisionTasks.get(String(r._id)) ?? null)
          : null;
    const rowProjects = [...new Set(lines.map((l) => String(l.project)))]
      .map((id) => projectById.get(id))
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, NAME_ORDER));
    return {
      _id: r._id,
      weekKey: r.weekKey,
      weekStart: toDateString(r.weekStart),
      weekEnd: toDateString(r.weekEnd),
      status: r.status,
      approvalRequested: !!r.approvalRequested,
      projects: rowProjects,
      tasksDone: servedTasks
        ? servedTasks.filter((t) => t.status === "done").length
        : null,
      taskCount: new Set(lines.map((l) => String(l.task))).size,
      hours: sumHours(lines),
      revisionNumber: r.revisionNumber,
      submittedAt: r.submittedAt ?? null,
      lastActivityAt: r.lastActivityAt ?? null,
      postedWeekdays: sortedDays(r.days).map((d) => d.weekday),
      isNew: fresh.has(String(r._id)),
    };
  });
}

// Rows never need comments or the private body beyond task statuses.
const ROW_FIELDS = {
  author: 1,
  weekKey: 1,
  weekStart: 1,
  weekEnd: 1,
  status: 1,
  approvalRequested: 1,
  revisionNumber: 1,
  submittedAt: 1,
  lastActivityAt: 1,
  "content.tasks": 1,
  "days.weekday": 1,
  "days.lines": 1,
};

function weekFilter({ weekFrom, weekTo }) {
  if (!weekFrom && !weekTo) return {};
  const range = {};
  if (weekFrom) range.$gte = weekFrom;
  if (weekTo) range.$lte = weekTo;
  return { weekKey: range };
}

// ---------------------------------------------------------------- reads

/** R1 — always the actor's own reports. */
export async function listMyReports(actor, filters) {
  const filter = { author: oid(actor.id), ...weekFilter(filters) };
  if (filters.status) filter.status = { $in: filters.status };
  if (filters.project) filter["days.lines.project"] = oid(filters.project);
  const dir = filters.dir === "asc" ? 1 : -1;
  const window = pageWindow(filters);
  const [total, reports] = await Promise.all([
    Report.countDocuments(filter),
    Report.find(filter)
      .select(ROW_FIELDS)
      .sort({ [filters.sort]: dir, weekKey: dir, _id: dir })
      .skip(window.skip)
      .limit(window.limit)
      .lean(),
  ]);
  return paginated(await reportRows(actor, reports), { ...filters, total });
}

/** R2 — the personal strip. Hours are the author's lines dated in the month. */
export async function summary(actor, { weekKey, month }) {
  const monthStart = new Date(`${month}-01T00:00:00.000Z`);
  const monthEnd = new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0),
  );
  const author = oid(actor.id);
  const [weeksFiled, inMonth, week] = await Promise.all([
    Report.countDocuments({ author, revisionNumber: { $gt: 0 } }),
    Report.find({
      author,
      weekStart: { $lte: monthEnd },
      weekEnd: { $gte: monthStart },
    })
      .select("weekKey days.weekday days.lines.hours")
      .lean(),
    Report.findOne({ author, weekKey })
      .select("days.blockers._id blockerResolutions")
      .lean(),
  ]);
  let hoursThisMonth = 0;
  for (const report of inMonth) {
    for (const day of report.days ?? []) {
      const date = weekdayDate(report.weekKey, day.weekday);
      if (date >= monthStart && date <= monthEnd)
        hoursThisMonth += sumHours(day.lines ?? []);
    }
  }
  const resolved = new Set(
    (week?.blockerResolutions ?? []).map((r) => String(r.blockerId)),
  );
  const openBlockers = week
    ? blockersOf(week).filter((b) => !resolved.has(String(b._id))).length
    : 0;
  return { weeksFiled, hoursThisMonth, openBlockers };
}

/** R3 — the caller's week; `report: null` until the first daily update. */
export async function getMyWeek(actor, weekKey) {
  const [user, report] = await Promise.all([
    User.findById(actor.id).select(USER_FIELDS).lean(),
    Report.findOne({ author: actor.id, weekKey }).lean(),
  ]);
  return weekView(actor, user, weekKey, report);
}

/** R4 */
export async function getReport(actor, reportId) {
  return weekViewOf(actor, await loadOpenable(actor, reportId));
}

/** U8 — anyone's week, with the layers of I15. */
export async function getUserWeek(actor, userId, weekKey) {
  const user = await User.findById(userId).select(USER_FIELDS).lean();
  if (!user) throw userNotFound();
  const report = await Report.findOne({ author: user._id, weekKey }).lean();
  if (!canOpenWeek(actor, report ?? { author: user._id, status: null }))
    throw reportForbidden();
  return weekView(actor, user, weekKey, report);
}

/**
 * U7 — every week the person was on the team, up to the current week, plus any week
 * they have a report for (database_schema.md §5.0b). Weeks are built in memory, joined
 * to the reports, filtered, sorted and paged.
 */
export async function listUserReports(actor, userId, filters) {
  const user = await User.findById(userId).select(USER_FIELDS).lean();
  if (!user) throw userNotFound();
  const reports = await Report.find({ author: user._id })
    .select(ROW_FIELDS)
    .lean();
  const byWeek = new Map(reports.map((r) => [r.weekKey, r]));

  const now = new Date();
  const current = currentWeekKey(now);
  const weekKeys = new Set(byWeek.keys());
  for (const period of user.workPeriods ?? []) {
    const last = period.to ? weekKeyOf(period.to) : current;
    const end = last < current ? last : current;
    for (let wk = weekKeyOf(period.from); wk <= end; wk = shiftWeek(wk, 1)) {
      if (calendar.isOnTeamForWeek(user, wk)) weekKeys.add(wk);
    }
  }
  const keys = [...weekKeys].sort();
  const holidays =
    keys.length > 0
      ? await calendar.holidaySet(weekStartOf(keys[0]), weekEndOf(keys.at(-1)))
      : new Set();

  let rows = keys.map((weekKey) => {
    const report = byWeek.get(weekKey);
    if (report) return { weekKey, status: report.status, report };
    const workingDays = calendar.workingDaysIn(weekKey, holidays);
    const expectedDays = calendar.expectedDaysOf(user, weekKey, workingDays);
    return {
      weekKey,
      status: calendar.weekStateOf({ workingDays, expectedDays, report: null }),
      report: null,
    };
  });

  if (filters.status)
    rows = rows.filter((r) => filters.status.includes(r.status));
  if (filters.weekFrom)
    rows = rows.filter((r) => r.weekKey >= filters.weekFrom);
  if (filters.weekTo) rows = rows.filter((r) => r.weekKey <= filters.weekTo);

  const dir = filters.dir === "asc" ? 1 : -1;
  const byWeekKey = (a, b) =>
    a.weekKey < b.weekKey ? -dir : a.weekKey > b.weekKey ? dir : 0;
  if (filters.sort === "lastActivityAt") {
    // Rows with no activity — WeekRows, and drafts — go last, whatever the direction.
    const at = (r) => r.report?.lastActivityAt?.getTime() ?? null;
    rows.sort((a, b) => {
      const x = at(a);
      const y = at(b);
      if (x === null || y === null) {
        if (x !== y) return x === null ? 1 : -1;
        if (!a.report !== !b.report) return a.report ? -1 : 1;
        return byWeekKey(a, b);
      }
      return x === y ? byWeekKey(a, b) : (x - y) * dir;
    });
  } else {
    rows.sort(byWeekKey);
  }

  const window = pageWindow(filters);
  const page = rows.slice(window.skip, window.skip + window.limit);
  const reportItems = await reportRows(
    actor,
    page.filter((r) => r.report).map((r) => r.report),
  );
  const itemById = new Map(reportItems.map((i) => [String(i._id), i]));
  const items = page.map((r) =>
    r.report
      ? itemById.get(String(r.report._id))
      : {
          _id: null,
          weekKey: r.weekKey,
          weekStart: toDateString(weekStartOf(r.weekKey)),
          weekEnd: toDateString(weekEndOf(r.weekKey)),
          status: r.status,
          hours: null,
          projects: [],
          taskCount: null,
          tasksDone: null,
          revisionNumber: 0,
          lastActivityAt: null,
          isNew: false, // nothing to see in a week with no report
        },
  );
  return paginated(items, { ...filters, total: rows.length });
}

/** R8 — newest first. */
export async function listRevisions(actor, reportId) {
  const report = await loadOpenable(actor, reportId);
  if (!canReadContent(actor, report)) throw reportForbidden();
  const revisions = await Revision.find({ report: report._id })
    .select("-content -days")
    .sort({ revisionNumber: -1 })
    .lean();
  const users = await usersById(
    revisions.flatMap((v) => [v.submittedBy, v.reviewedBy]),
  );
  return { items: revisions.map((v) => revisionSummary(v, report, users)) };
}

function revisionSummary(revision, report, users) {
  return {
    revisionNumber: revision.revisionNumber,
    isCurrent: revision.revisionNumber === report.revisionNumber,
    approvalRequested: !!revision.approvalRequested,
    submittedAt: revision.submittedAt,
    submittedBy: users.get(String(revision.submittedBy)) ?? null,
    action: revision.action ?? null,
    comment: revision.comment ?? null,
    reviewedBy: revision.reviewedBy
      ? (users.get(String(revision.reviewedBy)) ?? null)
      : null,
    reviewedAt: revision.reviewedAt ?? null,
  };
}

/** R9 — the snapshot as submitted: no comments, no resolution state. */
export async function getRevision(actor, reportId, revisionNumber) {
  const report = await loadOpenable(actor, reportId);
  if (!canReadContent(actor, report)) throw reportForbidden();
  const revision = await Revision.findOne({
    report: report._id,
    revisionNumber,
  }).lean();
  if (!revision)
    throw new AppError(
      404,
      "That version doesn't exist.",
      "REVISION_NOT_FOUND",
    );
  const contentTasks = revision.content?.tasks ?? [];
  const [users, tasks] = await Promise.all([
    usersById([revision.submittedBy, revision.reviewedBy]),
    taskRefsById([
      ...linesOf(revision).map((l) => l.task),
      ...contentTasks.map((t) => t.task),
    ]),
  ]);
  return {
    ...revisionSummary(revision, report, users),
    content: {
      tasks: contentTasks.map((t) => ({
        task: tasks.get(String(t.task)) ?? null,
        status: t.status ?? null,
        note: t.note ?? "",
      })),
      ...contentBody(revision.content ?? {}),
    },
    days: sortedDays(revision.days).map((d) => ({
      weekday: d.weekday,
      lines: (d.lines ?? []).map((l) => lineOut(l, tasks)),
      blockers: (d.blockers ?? []).map((b) => ({
        _id: b._id,
        text: b.text,
        isKey: !!b.isKey,
      })),
      openToTeam: !!d.openToTeam,
      postedAt: d.postedAt ?? null,
      editedAt: d.editedAt ?? null,
      hours: sumHours(d.lines ?? []),
    })),
  };
}

/**
 * R12 — one entry per person on the team that week whose work period covers the day
 * (or who posted it), sorted by name with the viewer first. No `content` is read.
 */
export async function teamUpdates(
  actor,
  { weekKey, weekday, project, blockersOnly },
) {
  const people = (
    await User.find({ status: { $in: ["active", "removed"] } })
      .select(USER_FIELDS)
      .lean()
  ).filter((u) => calendar.isOnTeamForWeek(u, weekKey));
  const [reports, holidays] = await Promise.all([
    Report.find({ weekKey, author: { $in: people.map((u) => u._id) } })
      .select("author weekKey status days blockerResolutions")
      .lean(),
    holidaysOfWeek(weekKey),
  ]);
  const reportOf = new Map(reports.map((r) => [String(r.author), r]));

  let entries = people.flatMap((user) => {
    const report = reportOf.get(String(user._id));
    const day = report?.days?.find((d) => d.weekday === weekday);
    if (day) return [{ user, report, day, state: "posted" }];
    const availability = calendar.dayAvailability(
      user,
      weekKey,
      weekday,
      holidays,
    );
    if (availability === "not_on_team") return [];
    const state = availability === "expected" ? "not_posted" : availability;
    return [{ user, report: report ?? null, day: null, state }];
  });
  if (project)
    entries = entries.filter((e) =>
      e.day?.lines?.some((l) => sameId(l.project, project)),
    );
  if (blockersOnly)
    entries = entries.filter((e) => e.day?.blockers?.length > 0);

  entries.sort((a, b) => {
    if (sameId(a.user._id, actor.id)) return -1;
    if (sameId(b.user._id, actor.id)) return 1;
    return (
      a.user.name.localeCompare(b.user.name, undefined, NAME_ORDER) ||
      String(a.user._id).localeCompare(String(b.user._id))
    );
  });

  const ctx = await dayContext(
    actor,
    entries.filter((e) => e.day).map((e) => e.report),
  );
  return {
    items: entries.map((e) => ({
      user: userRef(e.user),
      state: e.state,
      reportId: e.report?._id ?? null,
      day: e.day ? dayOut(actor, e.report, e.day, ctx) : null,
    })),
  };
}

// ---------------------------------------------------------------- R5 — post or edit a day

/** I3: the first daily update of a week creates its report; a lost race loads the winner's. */
async function findOrCreateDraft(actor, weekKey) {
  try {
    const created = await Report.create({
      author: actor.id,
      weekKey,
      weekStart: weekStartOf(weekKey),
      weekEnd: weekEndOf(weekKey),
    });
    return created.toObject();
  } catch (err) {
    if (err?.code !== 11000) throw err;
    return Report.findOne({ author: actor.id, weekKey }).lean();
  }
}

// The whole day write as one pipeline update, conditioned on the open status: replace or
// append the day (comments and postedAt kept), then sync `content.tasks` with the lines
// and prune resolutions whose blocker is gone (database_schema.md §3.3).
function dayWritePipeline({ weekday, lines, blockers, openToTeam, now }) {
  const allOf = (field) => ({
    $reduce: {
      input: { $ifNull: ["$days", []] },
      initialValue: [],
      in: { $concatArrays: ["$$value", { $ifNull: [`$$this.${field}`, []] }] },
    },
  });
  return [
    {
      $set: {
        days: {
          $cond: [
            { $in: [weekday, { $ifNull: ["$days.weekday", []] }] },
            {
              $map: {
                input: "$days",
                as: "d",
                in: {
                  $cond: [
                    { $eq: ["$$d.weekday", weekday] },
                    {
                      $mergeObjects: [
                        "$$d",
                        {
                          $literal: {
                            lines,
                            blockers,
                            openToTeam,
                            editedAt: now,
                          },
                        },
                      ],
                    },
                    "$$d",
                  ],
                },
              },
            },
            {
              $concatArrays: [
                { $ifNull: ["$days", []] },
                [
                  {
                    $literal: {
                      weekday,
                      lines,
                      blockers,
                      openToTeam,
                      postedAt: now,
                      editedAt: null,
                      comments: [],
                    },
                  },
                ],
              ],
            },
          ],
        },
        updatedAt: now,
      },
    },
    {
      $set: {
        _lineTasks: {
          $reduce: {
            input: allOf("lines.task"),
            initialValue: [],
            in: {
              $cond: [
                { $in: ["$$this", "$$value"] },
                "$$value",
                { $concatArrays: ["$$value", ["$$this"]] },
              ],
            },
          },
        },
        _blockerIds: allOf("blockers._id"),
      },
    },
    {
      $set: {
        "content.tasks": {
          $let: {
            vars: { listed: { $ifNull: ["$content.tasks", []] } },
            in: {
              $concatArrays: [
                {
                  $filter: {
                    input: "$$listed",
                    as: "t",
                    cond: { $in: ["$$t.task", "$_lineTasks"] },
                  },
                },
                {
                  $map: {
                    input: {
                      $filter: {
                        input: "$_lineTasks",
                        as: "id",
                        cond: { $not: { $in: ["$$id", "$$listed.task"] } },
                      },
                    },
                    as: "id",
                    in: { task: "$$id", status: null, note: "" },
                  },
                },
              ],
            },
          },
        },
        blockerResolutions: {
          $filter: {
            input: { $ifNull: ["$blockerResolutions", []] },
            as: "r",
            cond: { $in: ["$$r.blockerId", "$_blockerIds"] },
          },
        },
      },
    },
    { $unset: ["_lineTasks", "_blockerIds"] },
  ];
}

/** R5 — the whole day, in the order of api_specification.md §2.5. */
export async function putDay(actor, weekKey, weekday, body) {
  const now = new Date();
  const user = await User.findById(actor.id).select(USER_FIELDS).lean();

  // 1. I4: inside a work period, up to the current week.
  if (weekKey > currentWeekKey(now) || !calendar.isOnTeamForWeek(user, weekKey))
    throw new AppError(
      422,
      "You can't write in that week.",
      "WEEK_OUT_OF_RANGE",
    );

  // 2. An expected day, not after today.
  const date = weekdayDate(weekKey, weekday);
  const holidays = await holidaysOfWeek(weekKey);
  const reason =
    date > boundDate(now)
      ? "future"
      : calendar.dayAvailability(user, weekKey, weekday, holidays);
  if (reason !== "expected")
    throw new AppError(
      422,
      "You can't post an update for that day.",
      "DAY_NOT_EXPECTED",
      { reason },
    );

  // 3. Tasks: own (and open, unless already in this week); new ones on active projects.
  const existing = await Report.findOne({ author: actor.id, weekKey }).lean();
  const taskById = await taskService.checkLineTasks(actor, {
    taskIds: body.lines.filter((l) => l.task).map((l) => l.task),
    newTasks: body.lines.filter((l) => l.newTask).map((l) => l.newTask),
    weekTaskIds: existing ? linesOf(existing).map((l) => l.task) : [],
  });

  // 4–5. Create the Draft on the first post; the week must be open.
  const report = existing ?? (await findOrCreateDraft(actor, weekKey));
  if (!OPEN_STATUSES.includes(report.status)) throw stateChanged(report.status);

  // 6. Insert new tasks, then write the day.
  const created = await taskService.createTasks(
    actor,
    body.lines.filter((l) => l.newTask).map((l) => l.newTask),
  );
  const previous = report.days?.find((d) => d.weekday === weekday);
  const keepId = (items, id) =>
    id && items?.some((x) => sameId(x._id, id))
      ? oid(id)
      : new mongoose.Types.ObjectId();
  let next = 0;
  const lines = body.lines.map((l) => {
    const task = l.task ? taskById.get(l.task.toLowerCase()) : created[next++];
    return {
      _id: keepId(previous?.lines, l._id),
      task: task._id,
      project: task.project,
      taskType: l.taskType,
      text: l.text,
      hours: l.hours,
    };
  });
  const blockers = body.blockers.map((b) => {
    const kept = b._id && previous?.blockers?.find((x) => sameId(x._id, b._id));
    return {
      _id: kept ? kept._id : new mongoose.Types.ObjectId(),
      text: b.text,
      isKey: !!kept?.isKey, // a kept blocker keeps its key flag; R6 sets it
    };
  });

  const result = await Report.updateOne(
    { _id: report._id, status: { $in: OPEN_STATUSES } },
    dayWritePipeline({
      weekday,
      lines,
      blockers,
      openToTeam: body.openToTeam,
      now,
    }),
  );
  if (result.matchedCount === 0) {
    await taskService.discardTasks(created);
    throw stateChanged(await currentStatus(report._id));
  }
  const saved = await Report.findById(report._id).lean();
  return weekView(actor, user, weekKey, saved, now);
}

// ---------------------------------------------------------------- R6 — autosave

/** R6 — `$set` on content (and the key-blocker flag), conditioned on the open status. */
export async function autosave(actor, reportId, body) {
  const report = await loadForAuthorWrite(actor, reportId);

  const fields = {};
  const listed = new Set(
    (report.content?.tasks ?? []).map((t) => String(t.task)),
  );
  (body.tasks ?? []).forEach((t, i) => {
    if (!listed.has(t.task.toLowerCase()))
      fields[`tasks.${i}.task`] = "That task isn't in this week.";
  });
  if (
    body.keyBlockerId &&
    !blockersOf(report).some((b) => sameId(b._id, body.keyBlockerId))
  )
    fields.keyBlockerId = "That blocker isn't in this week.";
  if (Object.keys(fields).length > 0) throw validationFailed(fields);

  const now = new Date();
  const set = { updatedAt: now };
  if (body.tasks) {
    const updates = body.tasks.map((t) => ({
      task: oid(t.task),
      ...(t.status !== undefined && { status: t.status }),
      ...(t.note !== undefined && { note: t.note }),
    }));
    set["content.tasks"] = {
      $map: {
        input: { $ifNull: ["$content.tasks", []] },
        as: "t",
        in: {
          $let: {
            vars: {
              u: {
                $first: {
                  $filter: {
                    input: { $literal: updates },
                    as: "u",
                    cond: { $eq: ["$$u.task", "$$t.task"] },
                  },
                },
              },
            },
            in: { $mergeObjects: ["$$t", { $ifNull: ["$$u", {}] }] },
          },
        },
      },
    };
  }
  // Empty rows are the form's business; only items with text are stored.
  if (body.nextWeek)
    set["content.nextWeek"] = {
      $literal: body.nextWeek.filter((s) => s !== ""),
    };
  if (body.achievements)
    set["content.achievements"] = {
      $literal: body.achievements
        .filter((a) => a.text !== "")
        .map((a) => ({
          _id: a._id ? oid(a._id) : new mongoose.Types.ObjectId(),
          text: a.text,
          isKey: a.isKey,
        })),
    };
  if (body.notes !== undefined) set["content.notes"] = { $literal: body.notes };
  if (body.links) set["content.links"] = { $literal: body.links };
  if (body.keyBlockerId !== undefined) {
    const key = body.keyBlockerId ? oid(body.keyBlockerId) : null;
    set.days = {
      $map: {
        input: { $ifNull: ["$days", []] },
        as: "d",
        in: {
          $mergeObjects: [
            "$$d",
            {
              blockers: {
                $map: {
                  input: { $ifNull: ["$$d.blockers", []] },
                  as: "b",
                  in: {
                    $mergeObjects: [
                      "$$b",
                      { isKey: { $eq: ["$$b._id", key] } },
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    };
  }

  const result = await Report.updateOne(
    { _id: report._id, status: { $in: OPEN_STATUSES } },
    [{ $set: set }],
  );
  if (result.matchedCount === 0)
    throw stateChanged(await currentStatus(report._id));
  return weekViewOf(actor, await loadReport(report._id));
}

// ---------------------------------------------------------------- R7 — submit

async function submitRulesFor(report) {
  const user = await User.findById(report.author).select(USER_FIELDS).lean();
  const holidays = await holidaysOfWeek(report.weekKey);
  const workingDays = calendar.workingDaysIn(report.weekKey, holidays);
  return checkSubmit({
    expectedDays: calendar.expectedDaysOf(user, report.weekKey, workingDays),
    postedDays: (report.days ?? []).map((d) => d.weekday),
    tasks: report.content?.tasks ?? [],
  });
}

/**
 * R7 — draft or needs_correction → submitted. The `$inc` on `revisionNumber` is the
 * atomic allocator: of two concurrent submits, one matches and one gets 409.
 */
export async function submit(actor, reportId, { requestApproval }) {
  const report = await loadForAuthorWrite(actor, reportId);
  const rules = await submitRulesFor(report);
  if (!rules.ok) throw validationFailed(rules.fields);

  const now = new Date();
  const updated = await Report.findOneAndUpdate(
    {
      _id: report._id,
      status: { $in: OPEN_STATUSES },
      // A task added by a day saved since the check has no status yet.
      "content.tasks": { $not: { $elemMatch: { status: null } } },
    },
    {
      $inc: { revisionNumber: 1 },
      $set: {
        status: "submitted",
        approvalRequested: requestApproval,
        submittedAt: now,
        lastActivityAt: now,
        interactionAt: now,
        latestComment: null,
      },
    },
    { new: true },
  ).lean();
  if (!updated) {
    const current = await loadReport(report._id);
    if (OPEN_STATUSES.includes(current.status)) {
      const again = await submitRulesFor(current);
      if (!again.ok) throw validationFailed(again.fields);
    }
    throw stateChanged(current.status);
  }

  await Revision.create({
    report: updated._id,
    revisionNumber: updated.revisionNumber,
    content: updated.content,
    days: (updated.days ?? []).map(({ comments, ...day }) => day), // eslint-disable-line no-unused-vars
    approvalRequested: requestApproval,
    submittedAt: now,
    submittedBy: actor.id,
  });
  await taskService.syncDoneAt(updated.content?.tasks ?? [], now);
  return weekViewOf(actor, updated);
}

// ---------------------------------------------------------------- R10, R11

/** R10 — idempotent both ways; resolving again keeps the first `resolvedAt`. */
export async function setResolution(actor, reportId, blockerId, resolved) {
  const report = await loadOpenable(actor, reportId);
  if (!canResolveBlocker(actor, report)) throw reportForbidden();
  if (!blockersOf(report).some((b) => sameId(b._id, blockerId)))
    throw new AppError(404, "That blocker doesn't exist.", "BLOCKER_NOT_FOUND");

  const id = oid(blockerId);
  if (!resolved) {
    await Report.updateOne(
      { _id: report._id },
      { $pull: { blockerResolutions: { blockerId: id } } },
    );
    return { blockerId: id, resolvedAt: null, resolvedBy: null };
  }
  await Report.updateOne(
    {
      _id: report._id,
      "days.blockers._id": id,
      "blockerResolutions.blockerId": { $ne: id },
    },
    {
      $push: {
        blockerResolutions: {
          blockerId: id,
          resolvedAt: new Date(),
          resolvedBy: actor.id,
        },
      },
    },
  );
  const saved = await Report.findById(report._id)
    .select("blockerResolutions")
    .lean();
  const resolution = saved?.blockerResolutions?.find((r) =>
    sameId(r.blockerId, id),
  );
  if (!resolution)
    throw new AppError(404, "That blocker doesn't exist.", "BLOCKER_NOT_FOUND");
  const users = await usersById([resolution.resolvedBy]);
  return {
    blockerId: id,
    resolvedAt: resolution.resolvedAt,
    resolvedBy: users.get(String(resolution.resolvedBy)) ?? null,
  };
}

/** R11 — any status; a weekday with no posted update → 404. */
export async function setTeamComments(actor, reportId, weekday, open) {
  const report = await loadOpenable(actor, reportId);
  if (!canToggleTeamComments(actor, report)) throw reportForbidden();
  const result = await Report.updateOne(
    { _id: report._id, "days.weekday": weekday },
    { $set: { "days.$.openToTeam": open } },
  );
  if (result.matchedCount === 0) throw reportNotFound();
  return dayView(actor, await loadReport(report._id), weekday);
}

// ---------------------------------------------------------------- views for reviewService

/** The `Day` of `report` on `weekday`, as `actor` reads it (C1, C5). */
export async function dayView(actor, report, weekday) {
  const ctx = await dayContext(actor, [report]);
  return dayOut(
    actor,
    report,
    report.days.find((d) => d.weekday === weekday),
    ctx,
  );
}

/** `{ weekComments }` as `actor` reads them (C2, C5); null when withheld. */
export async function weekCommentsView(actor, report) {
  if (!canReadContent(actor, report)) return { weekComments: null };
  const ctx = await dayContext(actor, [report], {
    extraUserIds: threadAuthors(report.weekComments),
  });
  return {
    weekComments: (report.weekComments ?? []).map((t) =>
      threadFor(actor, report, t, ctx, { weekThread: true }),
    ),
  };
}

/** One thread of `report` — a day's or the week's — as `actor` reads it (C3, C4). */
export async function threadView(actor, report, threadId) {
  const weekThread = (report.weekComments ?? []).find((t) =>
    sameId(t._id, threadId),
  );
  const thread =
    weekThread ??
    (report.days ?? [])
      .flatMap((d) => d.comments ?? [])
      .find((t) => sameId(t._id, threadId));
  const ctx = await dayContext(actor, [report], {
    extraUserIds: threadAuthors(weekThread ? [weekThread] : []),
  });
  return threadFor(actor, report, thread, ctx, { weekThread: !!weekThread });
}
