import { addDays, isWeekend } from "date-fns";
import {
  compareWeekKeys,
  isWeekKey,
  parseCalendarDate,
  toCalendarDate,
} from "../lib/dates.js";
import { fail, ok, withUser } from "./demoResponses.js";
import { userItem } from "./demoUserRoutes.js";
import { meOf, projectRef, userRef } from "./demoWeekView.js";

// The demo's answers for the catalogue the pages read beside the week (api_specification.md
// §2.4 T1, §2.3 P1–P5, §2.8 HD1–HD4, §2.2 U9, U10), with the server's rules: one name per
// project (case-insensitive), a plan that is replaced goes into its history, a holiday on a
// weekday and once per date.

const isManager = (user) => user.role === "manager" || user.role === "admin";
const sum = (items) => items.reduce((total, n) => total + n, 0);
const allLines = (store) =>
  store.reports.flatMap((r) =>
    r.days.flatMap((d) => d.lines.map((line) => ({ line, report: r }))),
  );

// ---------------------------------------------------------------- T1

function listTasks(store, { query }, actor) {
  const includeDone =
    query.includeDone === true || query.includeDone === "true";
  const lines = allLines(store);
  const items = store.tasks
    .filter((t) => t.owner === actor._id && (includeDone || !t.doneAt))
    .map((task) => {
      const own = lines.filter(({ line }) => line.taskId === task._id);
      const weeks = own
        .map(({ report }) => report.weekKey)
        .sort(compareWeekKeys);
      return {
        _id: task._id,
        name: task.name,
        project: projectRef(store, task.project),
        doneAt: task.doneAt,
        hoursTotal: sum(own.map(({ line }) => line.hours)),
        lastWeekKey: weeks.at(-1) ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  return ok({ items });
}

// ---------------------------------------------------------------- P1

// Working days from `startDate` to today inclusive, skipping holidays (§5.3).
function daysUsed(store, startDate) {
  const holidays = new Set(store.holidays.map((h) => h.date));
  const today = toCalendarDate(new Date());
  let n = 0;
  for (
    let date = parseCalendarDate(startDate);
    toCalendarDate(date) <= today;
    date = addDays(date, 1)
  ) {
    if (!isWeekend(date) && !holidays.has(toCalendarDate(date))) n += 1;
  }
  return n;
}

export function progressOf(store, project) {
  if (!project.plan) return null;
  const used = daysUsed(store, project.plan.startDate);
  const projectTasks = new Set(
    store.tasks.filter((t) => t.project === project._id).map((t) => t._id),
  );
  return {
    plan: project.plan,
    daysUsed: used,
    daysLeft: Math.max(0, project.plan.plannedDays - used),
    overdueDays: Math.max(0, used - project.plan.plannedDays),
    hoursLogged: sum(
      allLines(store)
        .filter(({ line }) => projectTasks.has(line.taskId))
        .map(({ line }) => line.hours),
    ),
    planHistory: project.planHistory ?? [],
  };
}

function listProjects(store, { query }, actor) {
  const status = query.status ?? "active";
  if (!["active", "inactive", "all"].includes(status)) {
    return fail(422, "VALIDATION_FAILED", "Some fields need attention.", {
      fields: { status: "Invalid option" },
    });
  }
  const mine = query.mine === true || query.mine === "true";
  const usedInWeek = isWeekKey(query.usedInWeek) ? query.usedInWeek : null;
  const memberIds = (project) =>
    store.users
      .filter(
        (u) => u.status === "active" && u.projectIds.includes(project._id),
      )
      .map((u) => u._id);
  const named = usedInWeek
    ? new Set(
        store.reports
          .filter((r) => r.weekKey === usedInWeek)
          .flatMap((r) => r.days.flatMap((d) => d.lines))
          .map((l) => store.tasks.find((t) => t._id === l.taskId)?.project),
      )
    : null;

  const items = store.projects
    .filter((p) =>
      usedInWeek
        ? p.status === "active" || named.has(p._id)
        : status === "all" || p.status === status,
    )
    .filter((p) => !mine || actor.projectIds.includes(p._id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((project) => {
      const assigned = actor.projectIds.includes(project._id);
      const item = {
        _id: project._id,
        name: project.name,
        description: project.description ?? "",
        status: project.status,
      };
      if (assigned || (isManager(actor) && project.plan)) {
        item.progress = progressOf(store, project);
      }
      if (isManager(actor)) {
        const members = memberIds(project);
        Object.assign(item, {
          memberIds: members,
          memberCount: members.length,
          taskCount: store.tasks.filter((t) => t.project === project._id)
            .length,
          createdAt: project.createdAt ?? null,
        });
      }
      return item;
    });
  return ok({ items });
}

// ---------------------------------------------------------------- HD1

function listHolidays(store, { query }) {
  const from = parseCalendarDate(query.from ?? "");
  const to = parseCalendarDate(query.to ?? "");
  if (!from || !to || to < from) {
    return fail(422, "VALIDATION_FAILED", "Some fields need attention.", {
      fields: { to: "Must be on or after from" },
    });
  }
  const items = store.holidays
    .filter((h) => h.date >= query.from && h.date <= query.to)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((h) => ({
      _id: h._id,
      date: h.date,
      name: h.name,
      createdBy: userRef(store, h.createdBy),
    }));
  return ok({ items });
}

// ---------------------------------------------------------------- U9, U10

function setLeave(store, { params, body }, actor) {
  const target = store.users.find((u) => u._id === params.userId);
  if (!target) return fail(404, "USER_NOT_FOUND", "That person doesn't exist.");
  if (target._id !== actor._id && !isManager(actor)) {
    return fail(403, "FORBIDDEN", "You don't have access to do that.");
  }
  if (target.status !== "active") {
    return fail(409, "USER_STATE_CHANGED", "This account has changed.");
  }
  const onLeave = Boolean(body?.onLeave);
  const now = new Date().toISOString();
  target.leaveHistory ??= [];
  if (onLeave && !target.onLeave) {
    target.leaveFrom = toCalendarDate(new Date());
    target.leaveHistory.push({ from: now, to: null, setBy: actor._id });
  }
  if (!onLeave && target.onLeave) {
    target.leaveFrom = null;
    const open = target.leaveHistory.at(-1);
    if (open && open.to == null) open.to = now;
  }
  target.onLeave = onLeave;
  return ok(
    target._id === actor._id ? meOf(store, target) : userItem(store, target),
  );
}

function listOnLeave(store) {
  const items = store.users
    .filter((u) => u.status === "active" && u.onLeave)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((u) => userRef(store, u._id));
  return ok({ items });
}

// ---------------------------------------------------------------- P2–P5

const invalid = (fields) =>
  fail(422, "VALIDATION_FAILED", "Some fields need attention.", { fields });
const managerOnly = (handler) =>
  withUser((store, req, actor) =>
    isManager(actor)
      ? handler(store, req, actor)
      : fail(403, "FORBIDDEN", "You don't have access to do that."),
  );
const adminOnly = (handler) =>
  withUser((store, req, actor) =>
    actor.role === "admin"
      ? handler(store, req, actor)
      : fail(403, "FORBIDDEN", "You don't have access to do that."),
  );
const projectNotFound = () =>
  fail(404, "PROJECT_NOT_FOUND", "That project doesn't exist.");

// A P1 manager item for one project, as listProjects builds it.
function projectItem(store, project) {
  const members = store.users
    .filter((u) => u.status === "active" && u.projectIds.includes(project._id))
    .map((u) => u._id);
  return {
    _id: project._id,
    name: project.name,
    description: project.description ?? "",
    status: project.status,
    ...(project.plan ? { progress: progressOf(store, project) } : {}),
    memberIds: members,
    memberCount: members.length,
    taskCount: store.tasks.filter((t) => t.project === project._id).length,
    createdAt: project.createdAt ?? null,
  };
}

const takenName = (store, name, exceptId) =>
  store.projects.some(
    (p) => p._id !== exceptId && p.name.toLowerCase() === name.toLowerCase(),
  );

// The name, description and member ids of P2 and P3; `partial` leaves out what is absent.
function readProjectBody(store, body, { partial }) {
  const fields = {};
  const out = {};
  if (!partial || body?.name !== undefined) {
    const name = String(body?.name ?? "").trim();
    if (name.length < 1 || name.length > 100)
      fields.name = "Enter a name of 1 to 100 characters.";
    out.name = name;
  }
  if (body?.description !== undefined || !partial) {
    const description = String(body?.description ?? "").trim();
    if (description.length > 200)
      fields.description = "Use 200 characters or fewer.";
    out.description = description;
  }
  if (body?.memberIds !== undefined || !partial) {
    out.memberIds = [...new Set(body?.memberIds ?? [])];
  }
  return { out, fields };
}

// The plan of P2 and P4: a weekday start, 1–1000 days, hours positive or null.
function readPlan(plan) {
  const fields = {};
  const startDate = String(plan?.startDate ?? "");
  const start = parseCalendarDate(startDate);
  if (!start || toCalendarDate(start) !== startDate)
    fields.startDate = "Use the form YYYY-MM-DD";
  else if (isWeekend(start)) fields.startDate = "Pick a Monday to Friday";
  const days = plan?.plannedDays;
  if (!Number.isInteger(days) || days < 1 || days > 1000)
    fields.plannedDays = "Use a whole number from 1 to 1000.";
  const hours = plan?.plannedHours ?? null;
  if (hours !== null && !(typeof hours === "number" && hours > 0))
    fields.plannedHours = "Use a number above 0, or leave it empty.";
  return {
    fields,
    plan: { startDate, plannedDays: days, plannedHours: hours },
  };
}

function setMembers(store, project, memberIds) {
  for (const user of store.users) {
    const has = user.projectIds.includes(project._id);
    const wants = memberIds.includes(user._id);
    if (wants && !has) user.projectIds.push(project._id);
    if (!wants && has)
      user.projectIds = user.projectIds.filter((id) => id !== project._id);
  }
}

function createProject(store, { body }) {
  const { out, fields } = readProjectBody(store, body, { partial: false });
  const planned = body?.plan ? readPlan(body.plan) : null;
  Object.assign(fields, planned?.fields);
  if (Object.keys(fields).length) return invalid(fields);
  if (takenName(store, out.name))
    return fail(409, "PROJECT_NAME_TAKEN", "A project already has that name.");
  const project = {
    _id: store.nextId("0b"),
    name: out.name,
    description: out.description,
    status: "active",
    plan: planned?.plan ?? null,
    planHistory: [],
    createdAt: new Date().toISOString(),
  };
  store.projects.push(project);
  setMembers(store, project, out.memberIds);
  return ok(projectItem(store, project), 201);
}

function updateProject(store, { params, body }) {
  const project = store.projects.find((p) => p._id === params.id);
  if (!project) return projectNotFound();
  const { out, fields } = readProjectBody(store, body, { partial: true });
  if (Object.keys(out).length === 0) {
    return invalid({ name: "Change the name, description or people" });
  }
  if (Object.keys(fields).length) return invalid(fields);
  if (out.name !== undefined && takenName(store, out.name, project._id))
    return fail(409, "PROJECT_NAME_TAKEN", "A project already has that name.");
  if (out.name !== undefined) project.name = out.name;
  if (out.description !== undefined) project.description = out.description;
  if (out.memberIds !== undefined) setMembers(store, project, out.memberIds);
  return ok(projectItem(store, project));
}

function putPlan(store, { params, body }, actor) {
  const project = store.projects.find((p) => p._id === params.id);
  if (!project) return projectNotFound();
  const { plan, fields } = readPlan(body);
  if (Object.keys(fields).length) return invalid(fields);
  if (project.plan) {
    project.planHistory = [
      ...(project.planHistory ?? []),
      {
        ...project.plan,
        changedAt: new Date().toISOString(),
        changedBy: userRef(store, actor._id),
      },
    ];
  }
  project.plan = plan;
  return ok(projectItem(store, project));
}

function deactivateProject(store, { params }) {
  const project = store.projects.find((p) => p._id === params.id);
  if (!project) return projectNotFound();
  project.status = "inactive";
  return ok(projectItem(store, project));
}

// ---------------------------------------------------------------- HD2–HD4

const holidayNotFound = () =>
  fail(404, "HOLIDAY_NOT_FOUND", "That holiday doesn't exist.");
const holidayExists = () =>
  fail(409, "HOLIDAY_EXISTS", "There's already a holiday on that date.");

const holidayItem = (store, h) => ({
  _id: h._id,
  date: h.date,
  name: h.name,
  createdBy: userRef(store, h.createdBy),
});

function readHoliday(body, { partial }) {
  const fields = {};
  const out = {};
  if (!partial || body?.date !== undefined) {
    const date = String(body?.date ?? "");
    const parsed = parseCalendarDate(date);
    if (!parsed || toCalendarDate(parsed) !== date)
      fields.date = "Use the form YYYY-MM-DD";
    else if (isWeekend(parsed)) fields.date = "Pick a Monday to Friday";
    out.date = date;
  }
  if (!partial || body?.name !== undefined) {
    const name = String(body?.name ?? "").trim();
    if (name.length < 1 || name.length > 100)
      fields.name = "Enter a name of 1 to 100 characters.";
    out.name = name;
  }
  return { out, fields };
}

function createHoliday(store, { body }, actor) {
  const { out, fields } = readHoliday(body, { partial: false });
  if (Object.keys(fields).length) return invalid(fields);
  if (store.holidays.some((h) => h.date === out.date)) return holidayExists();
  const holiday = { _id: store.nextId("0d"), ...out, createdBy: actor._id };
  store.holidays.push(holiday);
  return ok(holidayItem(store, holiday), 201);
}

function updateHoliday(store, { params, body }) {
  const holiday = store.holidays.find((h) => h._id === params.id);
  if (!holiday) return holidayNotFound();
  const { out, fields } = readHoliday(body, { partial: true });
  if (Object.keys(fields).length) return invalid(fields);
  if (
    out.date !== undefined &&
    store.holidays.some((h) => h._id !== holiday._id && h.date === out.date)
  )
    return holidayExists();
  Object.assign(holiday, out);
  return ok(holidayItem(store, holiday));
}

function deleteHoliday(store, { params }) {
  const holiday = store.holidays.find((h) => h._id === params.id);
  if (!holiday) return holidayNotFound();
  store.holidays = store.holidays.filter((h) => h !== holiday);
  return ok(holidayItem(store, holiday));
}

export const catalogRoutes = [
  ["get", "/tasks", withUser(listTasks)], // T1
  ["get", "/projects", withUser(listProjects)], // P1
  ["post", "/projects", managerOnly(createProject)], // P2
  ["patch", "/projects/:id", managerOnly(updateProject)], // P3
  ["put", "/projects/:id/plan", managerOnly(putPlan)], // P4
  ["post", "/projects/:id/deactivate", managerOnly(deactivateProject)], // P5
  ["get", "/holidays", withUser(listHolidays)], // HD1
  ["post", "/holidays", adminOnly(createHoliday)], // HD2
  ["patch", "/holidays/:id", adminOnly(updateHoliday)], // HD3
  ["delete", "/holidays/:id", adminOnly(deleteHoliday)], // HD4
  // U10 before any `/users/:userId` route could claim "on-leave".
  ["get", "/users/on-leave", withUser(listOnLeave)], // U10
  ["put", "/users/:userId/leave", withUser(setLeave)], // U9
];
