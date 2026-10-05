import { TASK_TYPES, WEEKDAYS } from "../lib/constants.js";
import {
  compareWeekKeys,
  currentWeekKey,
  isWeekKey,
  toCalendarDate,
  weekDays,
  weekKeyOf,
} from "../lib/dates.js";
import { isObjectId } from "../lib/routeParams.js";
import { fail, ok, withUser } from "./demoResponses.js";
import {
  dayAvailability,
  projectRef,
  threadOut,
  weekViewOf,
} from "./demoWeekView.js";

// The demo's answers for writing a day and for This week's two lists
// (api_specification.md §2.5 R1, R2, R5). R5 follows the server's order of checks, so
// every refusal the day panel handles can be met here too.

const OPEN = ["draft", "needs_correction"];
const invalid = (fields) =>
  fail(422, "VALIDATION_FAILED", "Some fields need attention.", { fields });

const linesOf = (report) => report.days.flatMap((d) => d.lines);
const sum = (items) => items.reduce((total, n) => total + n, 0);
const projectOfTask = (store, taskId) =>
  store.tasks.find((t) => t._id === taskId)?.project ?? null;

// ---------------------------------------------------------------- R5

// R5's validator (reportValidator.putDaySchema), with its messages and paths.
function bodyProblems(body) {
  const fields = {};
  const lines = Array.isArray(body?.lines) ? body.lines : null;
  if (!lines || lines.length < 1) fields.lines = "Add at least one line";
  else if (lines.length > 20) fields.lines = "Too big: expected at most 20";
  (lines ?? []).forEach((line, i) => {
    const at = (field) => `lines.${i}.${field}`;
    if ((line.task === undefined) === (line.newTask === undefined)) {
      fields[at("task")] = "Pick a task or start a new one";
    } else if (line.task !== undefined && !isObjectId(line.task)) {
      fields[at("task")] = "Not an id";
    } else if (line.newTask) {
      const name = String(line.newTask.name ?? "").trim();
      if (name.length < 1 || name.length > 200)
        fields[at("newTask.name")] = "Use 1 to 200 characters";
      if (!isObjectId(line.newTask.project))
        fields[at("newTask.project")] = "Not an id";
    }
    if (!TASK_TYPES.includes(line.taskType))
      fields[at("taskType")] = "Invalid option";
    const text = String(line.text ?? "").trim();
    if (text.length < 1 || text.length > 500)
      fields[at("text")] = "Use 1 to 500 characters";
    if (typeof line.hours !== "number" || !(line.hours > 0))
      fields[at("hours")] = "Must be more than 0";
    else if (!Number.isInteger(line.hours * 4))
      fields[at("hours")] = "Use quarter hours, e.g. 1.25";
  });
  const blockers = body?.blockers ?? [];
  if (!Array.isArray(blockers) || blockers.length > 10)
    fields.blockers = "Too big: expected at most 10";
  else
    blockers.forEach((b, i) => {
      const text = String(b?.text ?? "").trim();
      if (text.length < 1 || text.length > 500)
        fields[`blockers.${i}.text`] = "Use 1 to 500 characters";
    });
  if (typeof body?.openToTeam !== "boolean")
    fields.openToTeam = "Expected boolean";
  return Object.keys(fields).length ? fields : null;
}

function findOrCreateDraft(store, actor, weekKey) {
  let report = store.reports.find(
    (r) => r.author === actor._id && r.weekKey === weekKey,
  );
  if (report) return report;
  report = {
    _id: store.nextId("b1"),
    author: actor._id,
    weekKey,
    status: "draft",
    approvalRequested: false,
    revisionNumber: 0,
    submittedAt: null,
    lastActivityAt: null,
    updatedAt: null,
    days: [],
    content: {
      tasks: [],
      nextWeek: [],
      achievements: [],
      notes: "",
      links: [],
    },
    weekComments: [],
    blockerResolutions: [],
    latestComment: null,
    revisions: [],
  };
  store.reports.push(report);
  return report;
}

// content.tasks follows the lines: every task they name, in the order of first
// appearance, keeping the status and note of those already listed.
function syncContentTasks(report) {
  const listed = new Map(report.content.tasks.map((t) => [t.taskId, t]));
  const order = [];
  const sorted = [...report.days].sort(
    (a, b) => WEEKDAYS.indexOf(a.weekday) - WEEKDAYS.indexOf(b.weekday),
  );
  for (const line of sorted.flatMap((d) => d.lines)) {
    if (!order.includes(line.taskId)) order.push(line.taskId);
  }
  report.content.tasks = order.map(
    (taskId) => listed.get(taskId) ?? { taskId, status: null, note: "" },
  );
  const blockerIds = new Set(
    report.days.flatMap((d) => d.blockers.map((b) => b._id)),
  );
  report.blockerResolutions = report.blockerResolutions.filter((r) =>
    blockerIds.has(r.blockerId),
  );
}

function putDay(store, { params, body }, actor) {
  const { weekKey, weekday } = params;
  if (!isWeekKey(weekKey) || !WEEKDAYS.includes(weekday)) {
    return invalid({ weekKey: "Not a week key, e.g. 2026-W38" });
  }
  const problems = bodyProblems(body);
  if (problems) return invalid(problems);

  // 1. Inside the person's time on the team, up to the current week.
  const joinedWeek = weekKeyOf(new Date(actor.joinedAt));
  if (
    compareWeekKeys(weekKey, currentWeekKey()) > 0 ||
    compareWeekKeys(weekKey, joinedWeek) < 0
  ) {
    return fail(422, "WEEK_OUT_OF_RANGE", "You can't write in that week.");
  }

  // 2. An expected day, not after today.
  const { date } = weekDays(weekKey).find((d) => d.weekday === weekday);
  const reason =
    toCalendarDate(date) > toCalendarDate(new Date())
      ? "future"
      : dayAvailability(store, actor, weekKey, weekday);
  if (reason !== "expected") {
    return fail(
      422,
      "DAY_NOT_EXPECTED",
      "You can't post an update for that day.",
      { reason },
    );
  }

  // 3. Own tasks — open, unless already named this week — and active projects.
  const existing = store.reports.find(
    (r) => r.author === actor._id && r.weekKey === weekKey,
  );
  const weekTasks = new Set(
    existing ? linesOf(existing).map((l) => l.taskId) : [],
  );
  for (const line of body.lines.filter((l) => l.task)) {
    const task = store.tasks.find(
      (t) => t._id === line.task.toLowerCase() && t.owner === actor._id,
    );
    if (!task || (task.doneAt && !weekTasks.has(task._id))) {
      return fail(404, "TASK_NOT_FOUND", "That task doesn't exist.");
    }
  }
  for (const line of body.lines.filter((l) => l.newTask)) {
    const project = store.projects.find((p) => p._id === line.newTask.project);
    if (!project) {
      return fail(404, "PROJECT_NOT_FOUND", "That project doesn't exist.");
    }
    if (project.status !== "active") {
      return fail(422, "PROJECT_INACTIVE", "That project isn't active.");
    }
  }

  // 4–5. Create the Draft on the first post; the week must be open.
  const report = existing ?? findOrCreateDraft(store, actor, weekKey);
  if (!OPEN.includes(report.status)) {
    return fail(409, "REPORT_STATE_CHANGED", "This report changed.", {
      status: report.status,
    });
  }

  // 6. New tasks, then the day. Kept lines and blockers keep their ids (and a
  // blocker its key flag); comments are untouched.
  const now = new Date().toISOString();
  const previous = report.days.find((d) => d.weekday === weekday);
  const kept = (items, id) =>
    id && items?.some((x) => x._id === id) ? id : null;
  const lines = body.lines.map((line) => {
    let taskId = line.task?.toLowerCase();
    if (line.newTask) {
      taskId = store.nextId("0c");
      store.tasks.push({
        _id: taskId,
        name: line.newTask.name.trim(),
        project: line.newTask.project,
        owner: actor._id,
        doneAt: null,
      });
    }
    return {
      _id: kept(previous?.lines, line._id) ?? store.nextId("e1"),
      taskId,
      taskType: line.taskType,
      text: line.text.trim(),
      hours: line.hours,
    };
  });
  const blockers = body.blockers.map((b) => {
    const old = b._id && previous?.blockers.find((x) => x._id === b._id);
    return {
      _id: old ? old._id : store.nextId("f1"),
      text: b.text.trim(),
      isKey: Boolean(old?.isKey),
    };
  });
  const day = {
    weekday,
    lines,
    blockers,
    openToTeam: body.openToTeam,
    postedAt: previous?.postedAt ?? now,
    editedAt: previous ? now : null,
    comments: previous?.comments ?? [],
  };
  if (previous) report.days[report.days.indexOf(previous)] = day;
  else report.days.push(day);
  report.updatedAt = now;
  syncContentTasks(report);
  return ok(weekViewOf(store, actor, actor, weekKey, report));
}

// ---------------------------------------------------------------- R1, R2

function reportRow(store, actor, report) {
  const lines = linesOf(report);
  const projectIds = [
    ...new Set(
      lines.map((l) => projectOfTask(store, l.taskId)).filter(Boolean),
    ),
  ];
  const threads = [
    ...report.weekComments.map((t) =>
      threadOut(store, actor, report, t, { week: true }),
    ),
    ...report.days.flatMap((d) =>
      d.comments.map((t) =>
        threadOut(store, actor, report, t, { week: false }),
      ),
    ),
  ];
  const days = weekDays(report.weekKey);
  return {
    _id: report._id,
    weekKey: report.weekKey,
    weekStart: toCalendarDate(days[0].date),
    weekEnd: toCalendarDate(days[4].date),
    status: report.status,
    approvalRequested: report.approvalRequested,
    projects: projectIds.map((id) => projectRef(store, id)),
    tasksDone: report.content.tasks.filter((t) => t.status === "done").length,
    taskCount: new Set(lines.map((l) => l.taskId)).size,
    hours: sum(lines.map((l) => l.hours)),
    revisionNumber: report.revisionNumber,
    submittedAt: report.submittedAt,
    lastActivityAt: report.lastActivityAt,
    postedWeekdays: WEEKDAYS.filter((d) =>
      report.days.some((day) => day.weekday === d),
    ),
    isNew: threads.some((t) => t.isNew),
  };
}

const SORTS = ["weekKey", "lastActivityAt", "submittedAt"];

function listMyReports(store, { query }, actor) {
  const sort = query.sort ?? "weekKey";
  const dir = query.dir ?? "desc";
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  if (!SORTS.includes(sort) || !["asc", "desc"].includes(dir)) {
    return invalid({ sort: "Invalid option" });
  }
  if (![20, 50, 100].includes(limit) || !(page >= 1)) {
    return invalid({ limit: "Invalid option" });
  }
  const statuses = query.status ? String(query.status).split(",") : null;
  let reports = store.reports.filter((r) => r.author === actor._id);
  if (statuses) reports = reports.filter((r) => statuses.includes(r.status));
  if (query.project) {
    reports = reports.filter((r) =>
      linesOf(r).some((l) => projectOfTask(store, l.taskId) === query.project),
    );
  }
  if (query.weekFrom)
    reports = reports.filter(
      (r) => compareWeekKeys(r.weekKey, query.weekFrom) >= 0,
    );
  if (query.weekTo)
    reports = reports.filter(
      (r) => compareWeekKeys(r.weekKey, query.weekTo) <= 0,
    );

  const value = (r) => (sort === "weekKey" ? r.weekKey : (r[sort] ?? ""));
  reports.sort((a, b) => {
    const order = value(a) < value(b) ? -1 : value(a) > value(b) ? 1 : 0;
    return dir === "asc" ? order : -order;
  });
  const total = reports.length;
  const items = reports
    .slice((page - 1) * limit, page * limit)
    .map((r) => reportRow(store, actor, r));
  return ok({
    items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

function summary(store, { query }, actor) {
  if (
    !isWeekKey(query.weekKey) ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(query.month ?? "")
  ) {
    return invalid({ month: "Use the form YYYY-MM" });
  }
  const mine = store.reports.filter((r) => r.author === actor._id);
  let hoursThisMonth = 0;
  for (const report of mine) {
    const dates = weekDays(report.weekKey);
    for (const day of report.days) {
      const { date } = dates.find((d) => d.weekday === day.weekday);
      if (toCalendarDate(date).startsWith(query.month)) {
        hoursThisMonth += sum(day.lines.map((l) => l.hours));
      }
    }
  }
  const week = mine.find((r) => r.weekKey === query.weekKey);
  const resolved = new Set(
    (week?.blockerResolutions ?? []).map((r) => r.blockerId),
  );
  return ok({
    weeksFiled: mine.filter((r) => r.revisionNumber > 0).length,
    hoursThisMonth,
    openBlockers: (week?.days ?? [])
      .flatMap((d) => d.blockers)
      .filter((b) => !resolved.has(b._id)).length,
  });
}

export const dayRoutes = [
  ["get", "/reports", withUser(listMyReports)], // R1
  ["get", "/reports/summary", withUser(summary)], // R2
  ["put", "/reports/week/:weekKey/days/:weekday", withUser(putDay)], // R5
];
