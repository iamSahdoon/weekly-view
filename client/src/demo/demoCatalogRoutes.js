import { addDays, isWeekend } from "date-fns";
import {
  compareWeekKeys,
  isWeekKey,
  parseCalendarDate,
  toCalendarDate,
} from "../lib/dates.js";
import { fail, ok, withUser } from "./demoResponses.js";
import { meOf, projectRef, userRef } from "./demoWeekView.js";

// The demo's answers for what This week reads beside the week (api_specification.md
// §2.4 T1, §2.3 P1, §2.8 HD1, §2.2 U9, U10). The writes on projects, holidays and
// people arrive with their pages (C8).

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

function progressOf(store, project) {
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
  if (onLeave && !target.onLeave) target.leaveFrom = toCalendarDate(new Date());
  if (!onLeave) target.leaveFrom = null;
  target.onLeave = onLeave;
  return ok(
    target._id === actor._id
      ? meOf(store, target)
      : {
          ...userRef(store, target._id),
          email: target.email,
          joinedAt: target.joinedAt,
          isOwner: target.isOwner,
        },
  );
}

function listOnLeave(store) {
  const items = store.users
    .filter((u) => u.status === "active" && u.onLeave)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((u) => userRef(store, u._id));
  return ok({ items });
}

export const catalogRoutes = [
  ["get", "/tasks", withUser(listTasks)], // T1
  ["get", "/projects", withUser(listProjects)], // P1
  ["get", "/holidays", withUser(listHolidays)], // HD1
  // U10 before any `/users/:userId` route could claim "on-leave".
  ["get", "/users/on-leave", withUser(listOnLeave)], // U10
  ["put", "/users/:userId/leave", withUser(setLeave)], // U9
];
