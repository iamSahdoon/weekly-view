import { WEEKDAYS } from "../lib/constants.js";
import {
  compareWeekKeys,
  isWeekKey,
  toCalendarDate,
  weekDays,
} from "../lib/dates.js";
import { fail, ok, withUser } from "./demoResponses.js";
import {
  dayAvailability,
  dayOut,
  projectRef,
  userRef,
  weekViewOf,
} from "./demoWeekView.js";

// The demo's answers for the team feed and the review desk (api_specification.md §2.5
// R12, §2.7 V1–V3). The rules are the server's — never your own report, the pinned
// revision, the 10-character send-back — so the review page's refusals run here too.

const isManager = (user) => user.role === "manager" || user.role === "admin";
const projectOfTask = (store, taskId) =>
  store.tasks.find((t) => t._id === taskId)?.project ?? null;
const linesOf = (report) => report.days.flatMap((d) => d.lines);
const invalid = (fields) =>
  fail(422, "VALIDATION_FAILED", "Some fields need attention.", { fields });
const forbidden = () =>
  fail(403, "FORBIDDEN", "You don't have access to do that.");

// ---------------------------------------------------------------- R12

function listTeamUpdates(store, { query }, actor) {
  const { weekKey, weekday } = query;
  if (!isWeekKey(weekKey) || !WEEKDAYS.includes(weekday)) {
    return invalid({ weekday: "Invalid option" });
  }
  const blockersOnly =
    query.blockersOnly === true || query.blockersOnly === "true";

  let entries = store.users
    .filter((u) => u.status === "active")
    .flatMap((user) => {
      const report = store.reports.find(
        (r) => r.author === user._id && r.weekKey === weekKey,
      );
      const day = report?.days.find((d) => d.weekday === weekday);
      if (day) return [{ user, report, day, state: "posted" }];
      const availability = dayAvailability(store, user, weekKey, weekday);
      if (availability === "not_on_team") return [];
      const state = availability === "expected" ? "not_posted" : availability;
      return [{ user, report: report ?? null, day: null, state }];
    });

  if (query.project) {
    entries = entries.filter((e) =>
      e.day?.lines.some(
        (l) => projectOfTask(store, l.taskId) === query.project,
      ),
    );
  }
  // Open blockers only: a resolved one doesn't keep a day in the feed.
  if (blockersOnly) {
    entries = entries.filter((e) => {
      const resolved = new Set(
        (e.report?.blockerResolutions ?? []).map((r) => r.blockerId),
      );
      return (e.day?.blockers ?? []).some((b) => !resolved.has(b._id));
    });
  }

  entries.sort((a, b) => {
    if (a.user._id === actor._id) return -1;
    if (b.user._id === actor._id) return 1;
    return a.user.name.localeCompare(b.user.name);
  });
  return ok({
    items: entries.map((e) => ({
      user: userRef(store, e.user._id),
      state: e.state,
      reportId: e.report?._id ?? null,
      day: e.day ? dayOut(store, actor, e.report, e.day) : null,
    })),
  });
}

// ---------------------------------------------------------------- V1, V2

const changed = (report) =>
  fail(409, "REPORT_STATE_CHANGED", "This report changed.", {
    status: report.status,
  });

function reviewBody(body, { required }) {
  const comment = typeof body?.comment === "string" ? body.comment.trim() : "";
  const fields = {};
  if (!Number.isInteger(body?.revisionNumber) || body.revisionNumber < 1) {
    fields.revisionNumber = "Not a version";
  }
  if (required && (comment.length < 10 || comment.length > 2000)) {
    fields.comment = "Use 10 to 2000 characters";
  } else if (comment.length > 2000) {
    fields.comment = "Use at most 2000 characters";
  }
  return Object.keys(fields).length ? { fields } : { comment };
}

// Both actions are one claim on the pinned revision, then the report (database_schema
// §3.3); the second reviewer, or a stale pin, finds the revision already claimed.
function review(action) {
  const sendingBack = action === "changes_requested";
  return withUser((store, { params, body }, actor) => {
    if (!isManager(actor)) return forbidden();
    const parsed = reviewBody(body, { required: sendingBack });
    if (parsed.fields) return invalid(parsed.fields);
    const report = store.reports.find((r) => r._id === params.id);
    if (!report) {
      return fail(404, "REPORT_NOT_FOUND", "That report doesn't exist.");
    }
    if (report.author === actor._id) {
      return fail(
        403,
        "SELF_REVIEW_FORBIDDEN",
        "You can't review your own report.",
      );
    }
    const { revisionNumber } = body;
    if (
      report.status !== "submitted" ||
      report.revisionNumber !== revisionNumber
    ) {
      return changed(report);
    }
    const revision = report.revisions.find(
      (r) => r.revisionNumber === revisionNumber && r.action === null,
    );
    if (!revision) return changed(report);

    const now = new Date().toISOString();
    const { comment } = parsed;
    revision.action = action;
    if (comment) revision.comment = comment;
    revision.reviewedBy = actor._id;
    revision.reviewedAt = now;

    report.status = sendingBack ? "needs_correction" : "approved";
    report.lastActivityAt = now;
    report.updatedAt = now;
    report.latestComment = sendingBack
      ? { text: comment, author: actor._id, revisionNumber, createdAt: now }
      : null;
    if (comment) {
      report.weekComments.push({
        _id: store.nextId("d1"),
        author: actor._id,
        text: comment,
        createdAt: now,
        editedAt: null,
        revisionNumber,
        kind: sendingBack ? "send_back" : "approval",
        replies: [],
      });
    }
    const author = store.users.find((u) => u._id === report.author);
    return ok(weekViewOf(store, actor, author, report.weekKey, report));
  });
}

// ---------------------------------------------------------------- V3

const SORTS = ["submittedAt", "weekKey"];

function weekBounds(weekKey) {
  const days = weekDays(weekKey);
  return {
    start: toCalendarDate(days[0].date),
    end: toCalendarDate(days[4].date),
  };
}

// A desk row is new for a manager while they haven't opened the request since its
// latest submission (the server's marker rule for approval requests).
function isRequestNew(store, actor, report) {
  if (!report.approvalRequested) return false;
  const seen = store.seen[`${report._id}:${actor._id}`] ?? null;
  return !seen || report.submittedAt > seen;
}

function listReviewDesk(store, { query }, actor) {
  if (!isManager(actor)) return forbidden();
  const sort = query.sort ?? "submittedAt";
  const dir = query.dir ?? "asc";
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  if (!SORTS.includes(sort) || !["asc", "desc"].includes(dir)) {
    return invalid({ sort: "Invalid option" });
  }
  if (![20, 50, 100].includes(limit) || !(page >= 1)) {
    return invalid({ limit: "Invalid option" });
  }
  const approval = query.approval ?? "requested";
  if (!["requested", "all"].includes(approval)) {
    return invalid({ approval: "Invalid option" });
  }
  const list = (name) => (query[name] ? String(query[name]).split(",") : null);
  const people = list("person");
  const projects = list("project");
  const roles = list("role");

  // Under every filter combination, the actor's own report is not on the desk.
  let reports = store.reports.filter(
    (r) =>
      r.status === "submitted" &&
      r.author !== actor._id &&
      (approval === "all" || r.approvalRequested),
  );
  if (people) reports = reports.filter((r) => people.includes(r.author));
  if (roles) {
    reports = reports.filter((r) =>
      roles.includes(store.users.find((u) => u._id === r.author)?.role),
    );
  }
  if (projects) {
    reports = reports.filter((r) =>
      linesOf(r).some((l) => projects.includes(projectOfTask(store, l.taskId))),
    );
  }
  if (query.weekFrom) {
    reports = reports.filter(
      (r) => compareWeekKeys(r.weekKey, query.weekFrom) >= 0,
    );
  }
  if (query.weekTo) {
    reports = reports.filter(
      (r) => compareWeekKeys(r.weekKey, query.weekTo) <= 0,
    );
  }

  const key = (r) => (sort === "weekKey" ? r.weekKey : (r.submittedAt ?? ""));
  reports.sort((a, b) => {
    const order = key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0;
    return (
      (order || (a.weekKey < b.weekKey ? -1 : 1)) * (dir === "asc" ? 1 : -1)
    );
  });

  const total = reports.length;
  const items = reports.slice((page - 1) * limit, page * limit).map((r) => {
    const projectIds = [
      ...new Set(linesOf(r).map((l) => projectOfTask(store, l.taskId))),
    ].filter(Boolean);
    const bounds = weekBounds(r.weekKey);
    return {
      _id: r._id,
      author: userRef(store, r.author),
      projects: projectIds
        .map((id) => projectRef(store, id))
        .sort((a, b) => a.name.localeCompare(b.name)),
      weekKey: r.weekKey,
      weekStart: bounds.start,
      weekEnd: bounds.end,
      status: r.status,
      approvalRequested: r.approvalRequested,
      revisionNumber: r.revisionNumber,
      submittedAt: r.submittedAt,
      isNew: isRequestNew(store, actor, r),
    };
  });
  return ok({
    items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export const reviewRoutes = [
  ["get", "/updates", withUser(listTeamUpdates)], // R12
  ["post", "/reports/:id/review/approve", review("approved")], // V1
  ["post", "/reports/:id/review/send-back", review("changes_requested")], // V2
  ["get", "/review-desk", withUser(listReviewDesk)], // V3
];
