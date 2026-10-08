import { TASK_TYPES, WEEKDAYS } from "../lib/constants.js";
import { addWeeks, isWeekKey, toCalendarDate, weekDays } from "../lib/dates.js";
import { progressOf } from "./demoCatalogRoutes.js";
import { fail, ok, withUser } from "./demoResponses.js";
import {
  dayAvailability,
  dayStatesOf,
  expectedDaysOf,
  personWeekKeys,
  projectRef,
  userRef,
  weekStateOf,
} from "./demoWeekView.js";

// The demo's answers for the team dashboard (api_specification.md §2.9 D1–D6, D8). The
// rules are the server's: the team is built people-first, so someone who filed nothing is
// a row; `status` filters D2 and nothing else; D6 is not week-scoped; hours come from the
// week's lines at every status; Done tasks count in submitted reports and, for a report
// that was sent back, in the sent-back version (I13). D7 is the profile's strip.

const isManager = (user) => user.role === "manager" || user.role === "admin";
const FILED = ["submitted", "needs_correction", "approved"];
const NOT_EXPECTED = ["on_leave", "holiday_week"];
const STATE_ORDER = [
  "not_started",
  "on_leave",
  "holiday_week",
  "draft",
  "submitted",
  "needs_correction",
  "approved",
];
const FEED_SIZE = 8;

const sum = (items) => items.reduce((total, n) => total + n, 0);
const rate = (part, whole) => (whole === 0 ? null : part / whole);
const list = (value) =>
  value ? String(value).split(",").filter(Boolean) : null;
const invalid = (fields) =>
  fail(422, "VALIDATION_FAILED", "Some fields need attention.", { fields });
const forbidden = () =>
  fail(403, "FORBIDDEN", "You don't have access to do that.");

// Every dashboard read is for managers and admins, and takes a weekKey but D6.
function guarded(handler, { week = true } = {}) {
  return withUser((store, req, actor) => {
    if (!isManager(actor)) return forbidden();
    if (week && !isWeekKey(req.query.weekKey ?? req.query.endWeek)) {
      return invalid({ weekKey: "Not a week" });
    }
    return handler(store, req, actor);
  });
}

const projectOfTask = (store, taskId) =>
  store.tasks.find((t) => t._id === taskId)?.project ?? null;
const linesOf = (store, report) =>
  (report?.days ?? []).flatMap((d) =>
    d.lines.map((line) => ({
      ...line,
      project: projectOfTask(store, line.taskId),
    })),
  );

// ---------------------------------------------------------------- week rows (§5.0)

const isOnTeam = (store, user, weekKey) =>
  user.status === "active" &&
  WEEKDAYS.some(
    (day) => dayAvailability(store, user, weekKey, day) !== "not_on_team",
  );

/** One row per person on the team that week; `person` and `project` narrow it (I11). */
function weekRows(store, weekKey, { person, project }) {
  const people = list(person);
  return store.users
    .filter(
      (u) => (!people || people.includes(u._id)) && isOnTeam(store, u, weekKey),
    )
    .flatMap((user) => {
      const report =
        store.reports.find(
          (r) => r.author === user._id && r.weekKey === weekKey,
        ) ?? null;
      const lines = linesOf(store, report);
      if (project) {
        const named = lines.some((l) => l.project === project);
        const assigned = user.projectIds.includes(project);
        if (!(lines.length > 0 ? named : assigned)) return [];
      }
      const expectedDays = expectedDaysOf(store, user, weekKey);
      return [
        {
          user,
          report,
          lines,
          state: weekStateOf(store, report, weekKey, expectedDays),
        },
      ];
    });
}

function complianceOf(rows) {
  const expected = rows.filter((r) => !NOT_EXPECTED.includes(r.state));
  return {
    expected: expected.length,
    filed: expected.filter((r) => FILED.includes(r.state)).length,
  };
}

const openBlockersOf = (report) => {
  const resolved = new Set(
    (report?.blockerResolutions ?? []).map((r) => r.blockerId),
  );
  return (report?.days ?? []).flatMap((d) =>
    d.blockers.filter((b) => !resolved.has(b._id)),
  );
};

// Done tasks of a submitted report; a sent-back one counts its sent-back version.
function doneCount(report) {
  if (report.status === "draft") return null;
  const content =
    report.status === "needs_correction"
      ? report.revisions.find((v) => v.revisionNumber === report.revisionNumber)
          ?.content
      : report.content;
  return (content?.tasks ?? []).filter((t) => t.status === "done").length;
}

// ---------------------------------------------------------------- D1

function summary(store, { query }) {
  const { weekKey } = query;
  const window = Array.from({ length: 8 }, (_, i) => addWeeks(weekKey, i - 7));
  const weeks = window.map((key) => weekRows(store, key, query));
  const rows = weeks.at(-1);
  const { expected, filed } = complianceOf(rows);
  const trailing = weeks.map(complianceOf);
  const trailingExpected = sum(trailing.map((c) => c.expected));
  const trailingFiled = sum(trailing.map((c) => c.filed));

  const sentBack = rows.filter((r) => r.state === "needs_correction");
  const sentBackTimes = sentBack
    .map(
      ({ report }) =>
        report.revisions.find(
          (v) =>
            v.revisionNumber === report.revisionNumber &&
            v.action === "changes_requested",
        )?.reviewedAt,
    )
    .filter(Boolean)
    .sort();
  const withBlockers = rows.filter((r) => openBlockersOf(r.report).length > 0);

  return ok({
    weekKey,
    filed,
    expected,
    notFiled: expected - filed,
    onLeave: rows.filter((r) => r.state === "on_leave").length,
    compliance: rate(filed, expected),
    complianceTrailing: {
      weeks: 8,
      rate: rate(trailingFiled, trailingExpected),
    },
    needsCorrection: {
      count: sentBack.length,
      oldestSentBackAt: sentBackTimes[0] ?? null,
    },
    openBlockers: {
      count: sum(rows.map((r) => openBlockersOf(r.report).length)),
      peopleCount: withBlockers.length,
    },
  });
}

// ---------------------------------------------------------------- D2

const SORTS = ["name", "status", "lastActivityAt"];

function team(store, { query }) {
  const { weekKey } = query;
  const sort = query.sort ?? "name";
  const dir = query.dir ?? "asc";
  if (!SORTS.includes(sort) || !["asc", "desc"].includes(dir)) {
    return invalid({ sort: "Invalid option" });
  }
  const statuses = list(query.status);
  if (statuses && statuses.some((s) => !STATE_ORDER.includes(s))) {
    return invalid({ status: "Invalid option" });
  }
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  const sign = dir === "desc" ? -1 : 1;

  const rows = weekRows(store, weekKey, query).filter(
    (r) => !statuses || statuses.includes(r.state),
  );
  const byName = (a, b) => a.user.name.localeCompare(b.user.name);
  rows.sort((a, b) => {
    if (sort === "status") {
      return (
        (STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state)) * sign ||
        byName(a, b)
      );
    }
    if (sort === "lastActivityAt") {
      const x = a.report?.lastActivityAt ?? null;
      const y = b.report?.lastActivityAt ?? null;
      if (x === null || y === null)
        return x === y ? byName(a, b) : x === null ? 1 : -1;
      return x.localeCompare(y) * sign || byName(a, b);
    }
    return byName(a, b) * sign;
  });

  const now = Date.now();
  const items = rows
    .slice((page - 1) * limit, page * limit)
    .map(({ user, report, lines, state }) => ({
      user: userRef(store, user._id),
      state,
      approvalRequested: Boolean(report?.approvalRequested),
      postedWeekdays: WEEKDAYS.filter((d) =>
        report?.days.some((day) => day.weekday === d),
      ),
      dayStates: dayStatesOf(store, user, report, weekKey, now),
      hours: sum(lines.map((l) => l.hours)),
      projects: [...new Set(lines.map((l) => l.project))]
        .map((id) => projectRef(store, id))
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name)),
      report:
        report && !NOT_EXPECTED.includes(state)
          ? {
              _id: report._id,
              revisionNumber: report.revisionNumber,
              tasksDone: doneCount(report),
              taskCount: new Set(lines.map((l) => l.taskId)).size,
              lastActivityAt: report.lastActivityAt ?? null,
            }
          : null,
    }));
  return ok({
    items,
    meta: {
      page,
      limit,
      total: rows.length,
      totalPages: Math.ceil(rows.length / limit),
    },
  });
}

// ---------------------------------------------------------------- D3

function trend(store, { query }) {
  const weeks = Number(query.weeks ?? 8);
  if (![4, 8, 12].includes(weeks)) return invalid({ weeks: "Invalid option" });
  const keys = Array.from({ length: weeks }, (_, i) =>
    addWeeks(query.endWeek, i - (weeks - 1)),
  );
  const people = list(query.person);
  const reports = store.reports.filter(
    (r) =>
      keys.includes(r.weekKey) &&
      r.status !== "draft" &&
      (!people ||
        people.includes(r.author) ||
        r.author === query.trendPerson) &&
      (!query.project ||
        linesOf(store, r).some((l) => l.project === query.project)),
  );
  const series = (subset) =>
    keys.map((weekKey) => ({
      weekKey,
      tasksDone: sum(
        subset
          .filter((r) => r.weekKey === weekKey)
          .map((r) => doneCount(r) ?? 0),
      ),
    }));
  const inTeam = people
    ? reports.filter((r) => people.includes(r.author))
    : reports;
  return ok({
    weeks: keys,
    team: series(inTeam),
    person: query.trendPerson
      ? series(reports.filter((r) => r.author === query.trendPerson))
      : null,
  });
}

// ---------------------------------------------------------------- D4, D5

const weekLines = (store, query) =>
  weekRows(store, query.weekKey, query).flatMap((r) => r.lines);

function hours(store, { query }) {
  const lines = weekLines(store, query);
  const totals = Object.fromEntries(TASK_TYPES.map((t) => [t, 0]));
  for (const line of lines) totals[line.taskType] += line.hours;
  return ok({
    items: TASK_TYPES.map((type) => ({ type, hours: totals[type] })),
    total: sum(lines.map((l) => l.hours)),
  });
}

function workload(store, { query }) {
  const byProject = new Map();
  for (const line of weekLines(store, query)) {
    if (!byProject.has(line.project)) {
      byProject.set(
        line.project,
        Object.fromEntries(TASK_TYPES.map((t) => [t, 0])),
      );
    }
    byProject.get(line.project)[line.taskType] += line.hours;
  }
  const items = [...byProject]
    .map(([id, split]) => ({
      project: projectRef(store, id),
      hours: split,
      totalHours: sum(Object.values(split)),
    }))
    .filter((item) => item.project)
    .sort(
      (a, b) =>
        b.totalHours - a.totalHours ||
        a.project.name.localeCompare(b.project.name),
    );
  return ok({ items });
}

// ---------------------------------------------------------------- D6

function activity(store) {
  const events = store.reports.flatMap((report) =>
    report.revisions.flatMap((v) => [
      { type: "submitted", at: v.submittedAt, actor: v.submittedBy, v, report },
      ...(v.reviewedAt
        ? [
            {
              type: v.action === "approved" ? "approved" : "sent_back",
              at: v.reviewedAt,
              actor: v.reviewedBy,
              v,
              report,
            },
          ]
        : []),
    ]),
  );
  events.sort(
    (a, b) => b.at.localeCompare(a.at) || a.type.localeCompare(b.type),
  );
  return ok({
    items: events.slice(0, FEED_SIZE).map(({ type, at, actor, v, report }) => ({
      type,
      at,
      actor: userRef(store, actor),
      revisionNumber: v.revisionNumber,
      report: {
        _id: report._id,
        weekKey: report.weekKey,
        author: userRef(store, report.author),
        status: report.status,
      },
    })),
  });
}

// ---------------------------------------------------------------- D8

function projects(store, { query }) {
  const items = store.projects
    .filter((p) => p.status === "active" && p.plan)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((project) => {
      const totals = new Map();
      for (const report of store.reports) {
        for (const day of report.days) {
          for (const line of day.lines) {
            if (projectOfTask(store, line.taskId) !== project._id) continue;
            const entry = totals.get(report.author) ?? {
              hoursThisWeek: 0,
              hoursTotal: 0,
              lastDay: null,
            };
            totals.set(report.author, entry);
            entry.hoursTotal += line.hours;
            if (report.weekKey === query.weekKey)
              entry.hoursThisWeek += line.hours;
            const date = toCalendarDate(
              weekDays(report.weekKey).find((d) => d.weekday === day.weekday)
                .date,
            );
            if (!entry.lastDay || date > entry.lastDay) entry.lastDay = date;
          }
        }
      }
      return {
        project: projectRef(store, project._id),
        progress: progressOf(store, project),
        people: [...totals]
          .map(([id, entry]) => ({ user: userRef(store, id), ...entry }))
          .filter((e) => e.user)
          .sort(
            (a, b) =>
              b.hoursTotal - a.hoursTotal ||
              a.user.name.localeCompare(b.user.name),
          ),
      };
    });
  return ok({ items });
}

// ---------------------------------------------------------------- D7

// Every week the person was on the team, leave and holiday weeks left out; hours are the
// lines' at every status, corrections the revisions sent back.
function personMetrics(store, { params }) {
  const user = store.users.find((u) => u._id === params.userId);
  if (!user) return fail(404, "USER_NOT_FOUND", "That person doesn't exist.");
  const reports = store.reports.filter((r) => r.author === user._id);
  let expected = 0;
  let filed = 0;
  let totalHours = 0;
  for (const weekKey of personWeekKeys(user)) {
    const report = reports.find((r) => r.weekKey === weekKey) ?? null;
    const state = weekStateOf(
      store,
      report,
      weekKey,
      expectedDaysOf(store, user, weekKey),
    );
    if (NOT_EXPECTED.includes(state)) continue;
    expected += 1;
    if (FILED.includes(state)) filed += 1;
    totalHours += sum(linesOf(store, report).map((l) => l.hours));
  }
  return ok({
    reportsFiled: filed,
    compliance: rate(filed, expected),
    avgHoursPerWeek: expected === 0 ? null : totalHours / expected,
    corrections: sum(
      reports.map(
        (r) =>
          r.revisions.filter((v) => v.action === "changes_requested").length,
      ),
    ),
  });
}

export const dashboardRoutes = [
  ["get", "/dashboard/summary", guarded(summary)], // D1
  ["get", "/dashboard/team", guarded(team)], // D2
  ["get", "/dashboard/trend", guarded(trend)], // D3
  ["get", "/dashboard/hours", guarded(hours)], // D4
  ["get", "/dashboard/workload", guarded(workload)], // D5
  ["get", "/dashboard/activity", guarded(activity, { week: false })], // D6
  ["get", "/dashboard/people/:userId", guarded(personMetrics, { week: false })], // D7
  ["get", "/dashboard/projects", guarded(projects)], // D8
];
