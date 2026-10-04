// The whole permission model for a week, as pure functions — no Mongoose, no Express
// (tech_stack.md §3.1). A week has three layers: the days (the whole team), and the
// end-of-week `content` and week comments (the author; managers and admins once
// submitted). `report` is a plain object with at least `author` and `status`; `actor` is
// `{ id, role, isOwner }`.

export const OPEN_STATUSES = Object.freeze(["draft", "needs_correction"]);

// The one rule set behind both faces of content access: the author always, managers and
// admins on these statuses, never a teammate. buildReportScope / contentScope (Mongo) and
// canReadContent (in memory) are both derived from it; scopeParity.test.js holds them together.
const STAFF_CONTENT_STATUSES = Object.freeze([
  "submitted",
  "needs_correction",
  "approved",
]);

export const EDIT_WINDOW_MS = 10 * 60 * 1000;

const idOf = (ref) => String(ref?._id ?? ref);

export const isStaff = (actor) =>
  actor.role === "manager" || actor.role === "admin";

export const isAuthor = (actor, report) =>
  idOf(report.author) === String(actor.id);

/**
 * A Mongo filter over report lists. Members see their own reports; managers and admins
 * the team's. What each row may show is canReadContent's job.
 */
export function buildReportScope(actor, filters = {}) {
  return isStaff(actor) ? { ...filters } : { ...filters, author: actor.id };
}

/**
 * The review desk's base filter, shared by V3, V4 and N1 (api_specification.md §2.7):
 * submitted reports in the actor's scope, asked for approval unless `approval` is `all`,
 * and never the actor's own — whatever other filter is added beside it.
 */
export function reviewDeskScope(actor, { approval = "requested" } = {}) {
  return {
    $and: [
      buildReportScope(actor),
      { status: "submitted" },
      approval === "all" ? {} : { approvalRequested: true },
      { author: { $ne: actor.id } },
    ],
  };
}

/** The Mongo face of canReadContent: the reports whose content `actor` may read. */
export function contentScope(actor) {
  return isStaff(actor)
    ? {
        $or: [
          { author: actor.id },
          { status: { $in: [...STAFF_CONTENT_STATUSES] } },
        ],
      }
    : { author: actor.id };
}

/** The week and its days: anyone on the team (authenticate admits active people only). */
export function canOpenWeek(actor, report) {
  return actor?.id != null && report != null;
}

/** `content` and the week comments. */
export function canReadContent(actor, report) {
  return (
    isAuthor(actor, report) ||
    (isStaff(actor) && STAFF_CONTENT_STATUSES.includes(report.status))
  );
}

/**
 * Which content a reader gets (api_specification.md I13): `live`, the sent-back
 * `revision` for a manager or admin on Needs correction, or `withheld`.
 */
export function contentSourceFor(actor, report) {
  if (!canReadContent(actor, report)) return "withheld";
  if (isAuthor(actor, report)) return "live";
  return report.status === "needs_correction" ? "revision" : "live";
}

/** The author; any manager or admin, their own update included; a teammate while open. */
export function canCommentOnDay(actor, report, day) {
  return isAuthor(actor, report) || isStaff(actor) || !!day?.openToTeam;
}

export function canToggleTeamComments(actor, report) {
  return isAuthor(actor, report) || isStaff(actor);
}

/** Starting a week thread: a manager or admin who isn't the author, once submitted. */
export function canCommentOnWeek(actor, report) {
  return (
    isStaff(actor) && !isAuthor(actor, report) && report.status !== "draft"
  );
}

/** The writer, strictly within 10 minutes of `createdAt`. */
export function canEditOwnComment(actor, comment, now = new Date()) {
  return (
    idOf(comment.author) === String(actor.id) &&
    now.getTime() - new Date(comment.createdAt).getTime() < EDIT_WINDOW_MS
  );
}

/** Approve or send back: a manager or admin who isn't the author, on `submitted`. */
export function canReviewReport(actor, report) {
  return (
    isStaff(actor) && !isAuthor(actor, report) && report.status === "submitted"
  );
}

/** Days and content: the author, while the week is open. */
export function canEditContent(actor, report) {
  return isAuthor(actor, report) && OPEN_STATUSES.includes(report.status);
}

/** At every status; never a teammate. */
export function canResolveBlocker(actor, report) {
  return isAuthor(actor, report) || isStaff(actor);
}
