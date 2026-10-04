import mongoose from "mongoose";
import { TASK_TYPES } from "../constants/taskTypes.js";
import { WEEKDAYS } from "../constants/weekdays.js";
import { Project } from "../models/projectModel.js";
import { Report } from "../models/reportModel.js";
import { Revision } from "../models/revisionModel.js";
import { User } from "../models/userModel.js";
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
import * as projectService from "./projectService.js";
import { dayStatesOf } from "./reportService.js";
import { userRef } from "./userService.js";

// The team dashboard, the projects table and the person profile strip (D1–D8,
// project_structure.md §2.5). Every read is manager-only and read-only. The team is built
// users-first (database_schema.md §5.0): a person who filed nothing is a row, and
// _Not started_ is the absence of a report. Reports are projected without `content`,
// `weekComments` and day `comments` — the projection is the permission boundary — except
// for task statuses, read only to count Done tasks of a submitted report (or of the
// sent-back revision of a Needs-correction one, I13).

const NAME_ORDER = { sensitivity: "base" };
const BOUND_MS = 14 * 60 * 60 * 1000;
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

const oid = (id) => new mongoose.Types.ObjectId(String(id));
const sameId = (a, b) => String(a) === String(b);
const hoursOf = (lines) => lines.reduce((sum, l) => sum + l.hours, 0);
const rate = (part, whole) => (whole === 0 ? null : part / whole);
const byName = (a, b) =>
  a.name.localeCompare(b.name, undefined, NAME_ORDER) ||
  String(a._id).localeCompare(String(b._id));

const projectRef = (p) => ({ _id: p._id, name: p.name, status: p.status });

// What a dashboard row may read of a report: shared day layers only, never content.
const REPORT_FIELDS = [
  "author",
  "weekKey",
  "status",
  "approvalRequested",
  "revisionNumber",
  "lastActivityAt",
  "days.weekday",
  "days.lines",
  "days.blockers",
  "blockerResolutions",
].join(" ");
const USER_FIELDS = "name role status leave workPeriods projects";

const linesOf = (report) => (report?.days ?? []).flatMap((d) => d.lines ?? []);

// ---------------------------------------------------------------- week rows (§5.0)

/**
 * Rows for each of `weekKeys`: one per person on the team that week, built from the
 * users, never from the reports. `person` narrows the people; `project` keeps a row when
 * any of its lines names the project — or, with no lines yet, when the person is assigned
 * to it (I11). Users, reports and holidays are each read once for all the weeks.
 */
async function loadWeeks(weekKeys, { person, project } = {}) {
  const first = weekKeys.reduce((a, b) => (a < b ? a : b));
  const last = weekKeys.reduce((a, b) => (a > b ? a : b));
  const userFilter = { status: { $in: ["active", "removed"] } };
  if (person) userFilter._id = { $in: person.map(oid) };
  const users = await User.find(userFilter).select(USER_FIELDS).lean();

  const [reports, holidays] = await Promise.all([
    Report.find({
      weekKey: { $in: weekKeys },
      author: { $in: users.map((u) => u._id) },
    })
      .select(REPORT_FIELDS)
      .lean(),
    calendar.holidaySet(weekStartOf(first), weekEndOf(last)),
  ]);
  const reportOf = new Map(reports.map((r) => [`${r.author}:${r.weekKey}`, r]));

  const weeks = new Map();
  for (const weekKey of weekKeys) {
    const weekHolidays = new Set(
      [...holidays].filter(
        (d) =>
          d >= toDateString(weekStartOf(weekKey)) &&
          d <= toDateString(weekEndOf(weekKey)),
      ),
    );
    const workingDays = calendar.workingDaysIn(weekKey, weekHolidays);
    const rows = [];
    for (const user of users) {
      if (!calendar.isOnTeamForWeek(user, weekKey)) continue;
      const report = reportOf.get(`${user._id}:${weekKey}`) ?? null;
      const lines = linesOf(report);
      if (project) {
        const named = lines.some((l) => sameId(l.project, project));
        const assigned = (user.projects ?? []).some((p) => sameId(p, project));
        if (!(lines.length > 0 ? named : assigned)) continue;
      }
      const expectedDays = calendar.expectedDaysOf(user, weekKey, workingDays);
      rows.push({
        user,
        report,
        lines,
        state: calendar.weekStateOf({ workingDays, expectedDays, report }),
      });
    }
    weeks.set(weekKey, { weekKey, rows, holidays: weekHolidays });
  }
  return weeks;
}

async function loadWeek(weekKey, filters) {
  return (await loadWeeks([weekKey], filters)).get(weekKey);
}

/** Filed / expected over rows: on-leave and holiday-week rows are not expected. */
function complianceOf(rows) {
  const expected = rows.filter((r) => !NOT_EXPECTED.includes(r.state));
  const filed = expected.filter((r) => FILED.includes(r.state));
  return { expected: expected.length, filed: filed.length };
}

// ---------------------------------------------------------------- done tasks

/**
 * Done tasks per report id, for reports that have been submitted: the live task list
 * for Submitted and Approved, the sent-back revision's for Needs correction (I13).
 * Drafts have no entry — their task statuses are the author's alone.
 */
async function doneCountsOf(reports) {
  const counts = new Map();
  const live = reports.filter((r) =>
    ["submitted", "approved"].includes(r.status),
  );
  const sentBack = reports.filter((r) => r.status === "needs_correction");
  const [liveDocs, revisions] = await Promise.all([
    live.length === 0
      ? []
      : Report.find({ _id: { $in: live.map((r) => r._id) } })
          .select("content.tasks")
          .lean(),
    sentBack.length === 0
      ? []
      : Revision.find({
          $or: sentBack.map((r) => ({
            report: r._id,
            revisionNumber: r.revisionNumber,
          })),
        })
          .select("report content.tasks")
          .lean(),
  ]);
  const done = (tasks = []) => tasks.filter((t) => t.status === "done").length;
  for (const doc of liveDocs)
    counts.set(String(doc._id), done(doc.content?.tasks));
  for (const rev of revisions)
    counts.set(String(rev.report), done(rev.content?.tasks));
  return counts;
}

// ---------------------------------------------------------------- D1

/** D1 — the metric strip. */
export async function summary({ weekKey, person, project }) {
  const trailingWeeks = 8;
  const window = Array.from({ length: trailingWeeks }, (_, i) =>
    shiftWeek(weekKey, i - (trailingWeeks - 1)),
  );
  const weeks = await loadWeeks(window, { person, project });
  const { rows } = weeks.get(weekKey);
  const { expected, filed } = complianceOf(rows);

  const trailing = [...weeks.values()].map((w) => complianceOf(w.rows));
  const trailingExpected = trailing.reduce((n, c) => n + c.expected, 0);
  const trailingFiled = trailing.reduce((n, c) => n + c.filed, 0);

  const sentBack = rows.filter((r) => r.state === "needs_correction");
  const revisions =
    sentBack.length === 0
      ? []
      : await Revision.find({
          $or: sentBack.map((r) => ({
            report: r.report._id,
            revisionNumber: r.report.revisionNumber,
          })),
          action: "changes_requested",
        })
          .select("reviewedAt")
          .lean();
  const sentBackTimes = revisions.map((v) => v.reviewedAt).filter(Boolean);

  // Open blockers: every status, as posted, minus the ones marked resolved.
  let openBlockers = 0;
  const raisedBy = new Set();
  for (const { report } of rows) {
    if (!report) continue;
    const resolved = new Set(
      (report.blockerResolutions ?? []).map((r) => String(r.blockerId)),
    );
    for (const day of report.days ?? []) {
      for (const blocker of day.blockers ?? []) {
        if (resolved.has(String(blocker._id))) continue;
        openBlockers += 1;
        raisedBy.add(String(report.author));
      }
    }
  }

  return {
    weekKey,
    filed,
    expected,
    notFiled: expected - filed,
    onLeave: rows.filter((r) => r.state === "on_leave").length,
    compliance: rate(filed, expected),
    complianceTrailing: {
      weeks: trailingWeeks,
      rate: rate(trailingFiled, trailingExpected),
    },
    needsCorrection: {
      count: sentBack.length,
      oldestSentBackAt:
        sentBackTimes.length === 0
          ? null
          : new Date(Math.min(...sentBackTimes.map(Number))),
    },
    openBlockers: { count: openBlockers, peopleCount: raisedBy.size },
  };
}

// ---------------------------------------------------------------- D2

const RECENT_LAST = (a, b, dir) => {
  const x = a?.getTime() ?? null;
  const y = b?.getTime() ?? null;
  if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
  return (x - y) * dir;
};

/** D2 — the team table, one row per person on the team that week. */
export async function team({
  weekKey,
  person,
  project,
  status,
  sort,
  dir,
  page,
  limit,
}) {
  const { rows: all, holidays } = await loadWeek(weekKey, { person, project });
  const rows = status ? all.filter((r) => status.includes(r.state)) : all;

  const sign = dir === "desc" ? -1 : 1;
  const nameOrder = (a, b) => byName(a.user, b.user);
  rows.sort((a, b) => {
    if (sort === "status")
      return (
        (STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state)) * sign ||
        nameOrder(a, b)
      );
    if (sort === "lastActivityAt")
      return (
        RECENT_LAST(a.report?.lastActivityAt, b.report?.lastActivityAt, sign) ||
        nameOrder(a, b)
      );
    return nameOrder(a, b) * sign;
  });

  const window = pageWindow({ page, limit });
  const pageRows = rows.slice(window.skip, window.skip + window.limit);
  const reports = pageRows.map((r) => r.report).filter(Boolean);
  const [done, projects] = await Promise.all([
    doneCountsOf(reports),
    Project.find({
      _id: {
        $in: [
          ...new Set(
            pageRows.flatMap((r) => r.lines.map((l) => String(l.project))),
          ),
        ],
      },
    })
      .select("name status")
      .lean(),
  ]);
  const projectById = new Map(projects.map((p) => [String(p._id), p]));
  const now = new Date();

  const items = pageRows.map(({ user, report, lines, state }) => {
    const hasReport = report && !NOT_EXPECTED.includes(state);
    return {
      user: userRef(user),
      state,
      approvalRequested: !!report?.approvalRequested,
      postedWeekdays: WEEKDAYS.filter((d) =>
        report?.days?.some((day) => day.weekday === d),
      ),
      dayStates: dayStatesOf(user, weekKey, holidays, report, now),
      hours: hoursOf(lines),
      projects: [...new Set(lines.map((l) => String(l.project)))]
        .map((id) => projectById.get(id))
        .filter(Boolean)
        .map(projectRef)
        .sort(byName),
      report: hasReport
        ? {
            _id: report._id,
            revisionNumber: report.revisionNumber,
            tasksDone: done.get(String(report._id)) ?? null,
            taskCount: new Set(lines.map((l) => String(l.task))).size,
            lastActivityAt: report.lastActivityAt ?? null,
          }
        : null,
    };
  });
  return paginated(items, { page, limit, total: rows.length });
}

// ---------------------------------------------------------------- D3

/** D3 — Done tasks per week for the team, and for one person when asked. */
export async function trend({ endWeek, weeks, trendPerson, person, project }) {
  const keys = Array.from({ length: weeks }, (_, i) =>
    shiftWeek(endWeek, i - (weeks - 1)),
  );
  const filter = { weekKey: { $in: keys }, status: { $ne: "draft" } };
  if (person)
    filter.author = { $in: [...person, trendPerson].filter(Boolean).map(oid) };
  if (project) filter["days.lines.project"] = oid(project);
  const reports = await Report.find(filter)
    .select("author weekKey status revisionNumber")
    .lean();
  const done = await doneCountsOf(reports);

  const series = (subset) => {
    const totals = new Map(keys.map((k) => [k, 0]));
    for (const r of subset)
      totals.set(
        r.weekKey,
        totals.get(r.weekKey) + (done.get(String(r._id)) ?? 0),
      );
    return keys.map((weekKey) => ({ weekKey, tasksDone: totals.get(weekKey) }));
  };
  const inTeam = person
    ? reports.filter((r) => person.some((id) => sameId(id, r.author)))
    : reports;
  return {
    weeks: keys,
    team: series(inTeam),
    person: trendPerson
      ? series(reports.filter((r) => sameId(r.author, trendPerson)))
      : null,
  };
}

// ---------------------------------------------------------------- D4, D5

const reportLines = (rows) =>
  rows.flatMap((r) =>
    (r.report ? (r.report.days ?? []) : []).flatMap((d) => d.lines ?? []),
  );

/** D4 — time by task type, from the week's lines at every status. */
export async function hours({ weekKey, person, project }) {
  const { rows } = await loadWeek(weekKey, { person, project });
  const totals = Object.fromEntries(TASK_TYPES.map((t) => [t, 0]));
  for (const line of reportLines(rows)) totals[line.taskType] += line.hours;
  return {
    items: TASK_TYPES.map((type) => ({ type, hours: totals[type] })),
    total: hoursOf(reportLines(rows)),
  };
}

/** D5 — hours per project split by task type, busiest first. */
export async function workload({ weekKey, person, project }) {
  const { rows } = await loadWeek(weekKey, { person, project });
  const byProject = new Map();
  for (const line of reportLines(rows)) {
    const key = String(line.project);
    if (!byProject.has(key))
      byProject.set(key, Object.fromEntries(TASK_TYPES.map((t) => [t, 0])));
    byProject.get(key)[line.taskType] += line.hours;
  }
  const projects = await Project.find({ _id: { $in: [...byProject.keys()] } })
    .select("name status")
    .lean();
  const items = projects.map((p) => {
    const split = byProject.get(String(p._id));
    return {
      project: projectRef(p),
      hours: split,
      totalHours: Object.values(split).reduce((a, b) => a + b, 0),
    };
  });
  items.sort(
    (a, b) => b.totalHours - a.totalHours || byName(a.project, b.project),
  );
  return { items };
}

// ---------------------------------------------------------------- D6

/**
 * D6 — the latest eight events, whatever week they concern. Each of the two indexed
 * timestamps is read newest-first and capped, so the input is bounded without a window;
 * the lookups run last, over the page (database_schema.md §5.1).
 */
export async function activity() {
  const fields =
    "report revisionNumber submittedAt submittedBy action reviewedAt reviewedBy";
  const [submitted, reviewed] = await Promise.all([
    Revision.find({})
      .sort({ submittedAt: -1 })
      .limit(FEED_SIZE)
      .select(fields)
      .lean(),
    Revision.find({ reviewedAt: { $ne: null } })
      .sort({ reviewedAt: -1 })
      .limit(FEED_SIZE)
      .select(fields)
      .lean(),
  ]);
  const events = [
    ...submitted.map((v) => ({
      type: "submitted",
      at: v.submittedAt,
      actor: v.submittedBy,
      v,
    })),
    ...reviewed.map((v) => ({
      type: v.action === "approved" ? "approved" : "sent_back",
      at: v.reviewedAt,
      actor: v.reviewedBy,
      v,
    })),
  ]
    .sort((a, b) => b.at - a.at || a.type.localeCompare(b.type))
    .slice(0, FEED_SIZE);

  const reports = await Report.find({
    _id: { $in: events.map((e) => e.v.report) },
  })
    .select("weekKey author status")
    .lean();
  const reportById = new Map(reports.map((r) => [String(r._id), r]));
  const people = await User.find({
    _id: {
      $in: [
        ...events.map((e) => e.actor),
        ...reports.map((r) => r.author),
      ].filter(Boolean),
    },
  })
    .select("name role status leave")
    .lean();
  const refOf = new Map(people.map((u) => [String(u._id), userRef(u)]));

  return {
    items: events.map((e) => {
      const report = reportById.get(String(e.v.report));
      return {
        type: e.type,
        at: e.at,
        actor: refOf.get(String(e.actor)) ?? null,
        revisionNumber: e.v.revisionNumber,
        report: report && {
          _id: report._id,
          weekKey: report.weekKey,
          author: refOf.get(String(report.author)) ?? null,
          status: report.status,
        },
      };
    }),
  };
}

// ---------------------------------------------------------------- D7

/**
 * D7 — a person's strip over every week of their work periods up to the current one,
 * leave and holiday weeks left out. Weeks are derived as §5.0 does for the history
 * list; hours are read from lines at every status, corrections from revisions.
 */
export async function personMetrics(userId) {
  const user = await User.findById(userId).select(USER_FIELDS).lean();
  if (!user)
    throw new AppError(404, "That person doesn't exist.", "USER_NOT_FOUND");

  const current = weekKeyOf(calendar.todayUtc(new Date(Date.now() + BOUND_MS)));
  const keys = new Set();
  for (const period of user.workPeriods ?? []) {
    const lastKey = period.to ? weekKeyOf(period.to) : current;
    const end = lastKey < current ? lastKey : current;
    for (let wk = weekKeyOf(period.from); wk <= end; wk = shiftWeek(wk, 1)) {
      if (calendar.isOnTeamForWeek(user, wk)) keys.add(wk);
    }
  }
  const weekKeys = [...keys].sort();

  const reports = await Report.find({ author: user._id })
    .select("weekKey status days.lines.hours")
    .lean();
  const reportOf = new Map(reports.map((r) => [r.weekKey, r]));
  const holidays =
    weekKeys.length === 0
      ? new Set()
      : await calendar.holidaySet(
          weekStartOf(weekKeys[0]),
          weekEndOf(weekKeys.at(-1)),
        );

  let expected = 0;
  let filed = 0;
  let totalHours = 0;
  for (const weekKey of weekKeys) {
    const report = reportOf.get(weekKey) ?? null;
    const workingDays = calendar.workingDaysIn(weekKey, holidays);
    const expectedDays = calendar.expectedDaysOf(user, weekKey, workingDays);
    const state = calendar.weekStateOf({ workingDays, expectedDays, report });
    if (NOT_EXPECTED.includes(state)) continue;
    expected += 1;
    if (FILED.includes(state)) filed += 1;
    totalHours += hoursOf(linesOf(report));
  }

  const corrections = await Revision.countDocuments({
    report: { $in: reports.map((r) => r._id) },
    action: "changes_requested",
  });
  return {
    reportsFiled: filed,
    compliance: rate(filed, expected),
    avgHoursPerWeek: expected === 0 ? null : totalHours / expected,
    corrections,
  };
}

// ---------------------------------------------------------------- D8

/** D8 — every active project with a plan: progress, and who worked on it and how long. */
export async function projects({ weekKey }) {
  const found = await Project.find({ status: "active", plan: { $ne: null } })
    .sort({ name: 1, _id: 1 })
    .collation({ locale: "en", strength: 2 })
    .lean();
  if (found.length === 0) return { items: [] };

  const ids = found.map((p) => p._id);
  const [progress, grouped] = await Promise.all([
    projectService.progressFor(found),
    Report.aggregate([
      { $match: { "days.lines.project": { $in: ids } } },
      { $unwind: "$days" },
      { $unwind: "$days.lines" },
      { $match: { "days.lines.project": { $in: ids } } },
      {
        $group: {
          _id: {
            project: "$days.lines.project",
            author: "$author",
            weekKey: "$weekKey",
            weekday: "$days.weekday",
          },
          hours: { $sum: "$days.lines.hours" },
        },
      },
    ]),
  ]);
  const authors = await User.find({
    _id: { $in: [...new Set(grouped.map((g) => String(g._id.author)))] },
  })
    .select("name role status leave")
    .lean();
  const refOf = new Map(authors.map((u) => [String(u._id), userRef(u)]));

  const people = new Map(); // project id → author id → totals
  for (const { _id: key, hours: h } of grouped) {
    const byAuthor = people.get(String(key.project)) ?? new Map();
    people.set(String(key.project), byAuthor);
    const entry = byAuthor.get(String(key.author)) ?? {
      hoursThisWeek: 0,
      hoursTotal: 0,
      lastDay: null,
    };
    byAuthor.set(String(key.author), entry);
    entry.hoursTotal += h;
    if (key.weekKey === weekKey) entry.hoursThisWeek += h;
    const day = toDateString(weekdayDate(key.weekKey, key.weekday));
    if (!entry.lastDay || day > entry.lastDay) entry.lastDay = day;
  }

  return {
    items: found.map((p) => ({
      project: projectRef(p),
      progress: progress.get(String(p._id)),
      people: [...(people.get(String(p._id)) ?? [])]
        .map(([authorId, entry]) => ({ user: refOf.get(authorId), ...entry }))
        .filter((e) => e.user)
        .sort((a, b) => b.hoursTotal - a.hoursTotal || byName(a.user, b.user)),
    })),
  };
}
