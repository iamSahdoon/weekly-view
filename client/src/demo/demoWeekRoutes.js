import { isObjectId } from "../lib/routeParams.js";
import { WEEKDAYS } from "../lib/constants.js";
import { isWeekKey } from "../lib/dates.js";
import { fail, ok, withUser } from "./demoResponses.js";
import {
  canCommentOnDay,
  canReadContent,
  canResolveBlocker,
  canToggleTeamComments,
  dayOut,
  isEditable,
  revisionListOf,
  revisionOf,
  threadOut,
  userRef,
  weekViewOf,
} from "./demoWeekView.js";

// The demo's answers for reading a week and for comments (api_specification.md §2.2
// U8, §2.5 R3, R4, R8–R11, R13, §2.6 C1–C5). The rules are the server's, so a refused
// comment or a closed edit window shows the page's real error path.

const REPORT_MISSING = () =>
  fail(404, "REPORT_NOT_FOUND", "That report doesn't exist.");
const forbidden = () =>
  fail(403, "REPORT_FORBIDDEN", "You can't open this report.");
const isManager = (user) => user.role === "manager" || user.role === "admin";
const isAuthor = (user, report) => report.author === user._id;

function textProblem(text) {
  const value = typeof text === "string" ? text.trim() : "";
  if (value.length >= 1 && value.length <= 2000) return null;
  return fail(422, "VALIDATION_FAILED", "Check the highlighted fields.", {
    fields: { text: "Write 1 to 2000 characters." },
  });
}

// A thread by id, whichever of the report's lists holds it.
function findThread(report, threadId) {
  const week = report.weekComments.find((t) => t._id === threadId);
  if (week) return { thread: week, week: true, day: null };
  for (const day of report.days) {
    const thread = day.comments.find((t) => t._id === threadId);
    if (thread) return { thread, week: false, day };
  }
  return null;
}

const weekViewFor = (store, actor, user, weekKey) =>
  weekViewOf(
    store,
    actor,
    user,
    weekKey,
    store.reports.find((r) => r.author === user._id && r.weekKey === weekKey),
  );

// Loads a report and answers 404 / 403 before the handler runs.
const withReport = (handler, { needsRead = false } = {}) =>
  withUser((store, req, actor) => {
    const report = store.reports.find((r) => r._id === req.params.id);
    if (!report) return REPORT_MISSING();
    if (needsRead && !canReadContent(actor, report)) return forbidden();
    return handler(store, req, actor, report);
  });

const withThread = (handler) =>
  withReport((store, req, actor, report) => {
    const found = findThread(report, req.params.threadId);
    if (!found) {
      return fail(404, "THREAD_NOT_FOUND", "That comment doesn't exist.");
    }
    return handler(store, req, actor, report, found);
  });

// Who may write in a place: a day thread follows canCommentOnDay; a week thread is
// the author or a manager or admin.
const mayWriteIn = (actor, report, { week, day }) =>
  week
    ? isAuthor(actor, report) || isManager(actor)
    : canCommentOnDay(actor, report, day);

// A reply, or the thread itself, as `find` locates it; null when it doesn't exist.
function entryOf(thread, replyId) {
  return replyId
    ? (thread.replies.find((r) => r._id === replyId) ?? null)
    : thread;
}

export const weekRoutes = [
  // R3
  [
    "get",
    "/reports/week/:weekKey",
    withUser((store, { params }, actor) =>
      isWeekKey(params.weekKey)
        ? ok(weekViewFor(store, actor, actor, params.weekKey))
        : fail(422, "VALIDATION_FAILED", "Check the highlighted fields.", {
            fields: { weekKey: "That isn't a week." },
          }),
    ),
  ],
  // U8
  [
    "get",
    "/users/:userId/reports/:weekKey",
    withUser((store, { params }, actor) => {
      const user = store.users.find((u) => u._id === params.userId);
      if (!isObjectId(params.userId) || !isWeekKey(params.weekKey)) {
        return fail(422, "VALIDATION_FAILED", "Check the highlighted fields.");
      }
      if (!user)
        return fail(404, "USER_NOT_FOUND", "That person doesn't exist.");
      return ok(weekViewFor(store, actor, user, params.weekKey));
    }),
  ],
  // R4
  [
    "get",
    "/reports/:id",
    withReport((store, req, actor, report) =>
      ok(
        weekViewOf(
          store,
          actor,
          store.users.find((u) => u._id === report.author),
          report.weekKey,
          report,
        ),
      ),
    ),
  ],
  // R8
  [
    "get",
    "/reports/:id/revisions",
    withReport(
      (store, req, actor, report) => ok(revisionListOf(store, report)),
      {
        needsRead: true,
      },
    ),
  ],
  // R9
  [
    "get",
    "/reports/:id/revisions/:revisionNumber",
    withReport(
      (store, { params }, actor, report) => {
        const revision = report.revisions.find(
          (r) => r.revisionNumber === Number(params.revisionNumber),
        );
        if (!revision) {
          return fail(404, "REVISION_NOT_FOUND", "That version doesn't exist.");
        }
        return ok(revisionOf(store, report, revision));
      },
      { needsRead: true },
    ),
  ],
  // R10 — idempotent both ways; resolving twice keeps the first time.
  [
    "put",
    "/reports/:id/blockers/:blockerId/resolution",
    withReport((store, { params }, actor, report) => {
      if (!canResolveBlocker(actor, report)) return forbidden();
      const exists = report.days.some((d) =>
        d.blockers.some((b) => b._id === params.blockerId),
      );
      if (!exists) {
        return fail(404, "BLOCKER_NOT_FOUND", "That blocker doesn't exist.");
      }
      let resolution = report.blockerResolutions.find(
        (r) => r.blockerId === params.blockerId,
      );
      if (!resolution) {
        resolution = {
          blockerId: params.blockerId,
          resolvedAt: new Date().toISOString(),
          resolvedBy: actor._id,
        };
        report.blockerResolutions.push(resolution);
      }
      return ok({
        blockerId: params.blockerId,
        resolvedAt: resolution.resolvedAt,
        resolvedBy: userRef(store, resolution.resolvedBy),
      });
    }),
  ],
  [
    "delete",
    "/reports/:id/blockers/:blockerId/resolution",
    withReport((store, { params }, actor, report) => {
      if (!canResolveBlocker(actor, report)) return forbidden();
      const exists = report.days.some((d) =>
        d.blockers.some((b) => b._id === params.blockerId),
      );
      if (!exists) {
        return fail(404, "BLOCKER_NOT_FOUND", "That blocker doesn't exist.");
      }
      report.blockerResolutions = report.blockerResolutions.filter(
        (r) => r.blockerId !== params.blockerId,
      );
      return ok({
        blockerId: params.blockerId,
        resolvedAt: null,
        resolvedBy: null,
      });
    }),
  ],
  // R11
  [
    "put",
    "/reports/:id/days/:weekday/team-comments",
    withReport((store, { params, body }, actor, report) => {
      if (!canToggleTeamComments(actor, report)) return forbidden();
      const day = report.days.find((d) => d.weekday === params.weekday);
      if (!WEEKDAYS.includes(params.weekday) || !day) return REPORT_MISSING();
      day.openToTeam = Boolean(body.open);
      return ok(dayOut(store, actor, report, day));
    }),
  ],
  // R13 — the "new" markers clear the next time the week is read.
  [
    "post",
    "/reports/:id/seen",
    withReport((store, req, actor, report) => {
      store.seen[`${report._id}:${actor._id}`] = new Date().toISOString();
      return ok(null);
    }),
  ],
  // C1
  [
    "post",
    "/reports/:id/days/:weekday/comments",
    withReport((store, { params, body }, actor, report) => {
      const day = report.days.find((d) => d.weekday === params.weekday);
      if (!day) return REPORT_MISSING();
      if (!canCommentOnDay(actor, report, day)) {
        return fail(403, "COMMENT_NOT_ALLOWED", "You can't comment here.");
      }
      const problem = textProblem(body.text);
      if (problem) return problem;
      day.comments.push({
        _id: store.nextId("d1"),
        author: actor._id,
        text: body.text.trim(),
        createdAt: new Date().toISOString(),
        editedAt: null,
        replies: [],
      });
      return ok(dayOut(store, actor, report, day), 201);
    }),
  ],
  // C2 — a manager or admin, never on their own report, never on a Draft.
  [
    "post",
    "/reports/:id/week-comments",
    withReport((store, { body }, actor, report) => {
      if (!isManager(actor)) {
        return fail(403, "FORBIDDEN", "You don't have access to do that.");
      }
      if (isAuthor(actor, report)) {
        return fail(403, "COMMENT_NOT_ALLOWED", "You can't comment here.");
      }
      if (report.status === "draft") {
        return fail(409, "REPORT_STATE_CHANGED", "This report changed.", {
          status: report.status,
        });
      }
      const problem = textProblem(body.text);
      if (problem) return problem;
      report.weekComments.push({
        _id: store.nextId("d1"),
        author: actor._id,
        text: body.text.trim(),
        createdAt: new Date().toISOString(),
        editedAt: null,
        revisionNumber: report.revisionNumber,
        kind: "comment",
        replies: [],
      });
      return ok(
        {
          weekComments: report.weekComments.map((t) =>
            threadOut(store, actor, report, t, { week: true }),
          ),
        },
        201,
      );
    }),
  ],
  // C3
  [
    "post",
    "/reports/:id/threads/:threadId/replies",
    withThread((store, { body }, actor, report, found) => {
      if (!mayWriteIn(actor, report, found)) {
        return fail(403, "COMMENT_NOT_ALLOWED", "You can't comment here.");
      }
      const problem = textProblem(body.text);
      if (problem) return problem;
      found.thread.replies.push({
        _id: store.nextId("d1"),
        author: actor._id,
        text: body.text.trim(),
        createdAt: new Date().toISOString(),
        editedAt: null,
      });
      return ok(
        threadOut(store, actor, report, found.thread, { week: found.week }),
        201,
      );
    }),
  ],
  // C4 — the writer, inside the ten minutes.
  ["patch", "/reports/:id/threads/:threadId", editHandler()],
  ["patch", "/reports/:id/threads/:threadId/replies/:replyId", editHandler()],
  // C5
  ["delete", "/reports/:id/threads/:threadId", deleteHandler()],
  [
    "delete",
    "/reports/:id/threads/:threadId/replies/:replyId",
    deleteHandler(),
  ],
];

const windowClosed = () =>
  fail(403, "EDIT_WINDOW_CLOSED", "The 10 minutes to change this have passed.");

function editHandler() {
  return withThread((store, { params, body }, actor, report, found) => {
    const entry = entryOf(found.thread, params.replyId);
    if (!entry)
      return fail(404, "THREAD_NOT_FOUND", "That comment doesn't exist.");
    if (!isEditable(entry, actor)) return windowClosed();
    const problem = textProblem(body.text);
    if (problem) return problem;
    entry.text = body.text.trim();
    entry.editedAt = new Date().toISOString();
    return ok(
      threadOut(store, actor, report, found.thread, { week: found.week }),
    );
  });
}

function deleteHandler() {
  return withThread((store, { params }, actor, report, found) => {
    const entry = entryOf(found.thread, params.replyId);
    if (!entry)
      return fail(404, "THREAD_NOT_FOUND", "That comment doesn't exist.");
    if (!isEditable(entry, actor)) return windowClosed();
    if (!params.replyId) {
      if (
        found.thread.replies.length > 0 ||
        found.thread.kind === "send_back"
      ) {
        return fail(
          409,
          "COMMENT_HAS_REPLIES",
          "A comment with replies can't be deleted.",
        );
      }
      const list = found.week ? report.weekComments : found.day.comments;
      list.splice(list.indexOf(found.thread), 1);
    } else {
      found.thread.replies.splice(found.thread.replies.indexOf(entry), 1);
    }
    return ok(
      found.week
        ? {
            weekComments: report.weekComments.map((t) =>
              threadOut(store, actor, report, t, { week: true }),
            ),
          }
        : dayOut(store, actor, report, found.day),
    );
  });
}
