import mongoose from "mongoose";
import { Report } from "../models/reportModel.js";
import { Revision } from "../models/revisionModel.js";
import { User } from "../models/userModel.js";
import {
  EDIT_WINDOW_MS,
  canCommentOnDay,
  canCommentOnWeek,
  canEditOwnComment,
  canOpenWeek,
  canReadContent,
  isAuthor,
  isStaff,
  reviewDeskScope,
} from "../policies/reportPolicy.js";
import { AppError } from "../utils/appError.js";
import { pageWindow, paginated } from "../utils/paginate.js";
import { toDateString } from "../utils/weeks.js";
import * as markerService from "./markerService.js";
import * as reportService from "./reportService.js";
import { userRef } from "./userService.js";

// The conversation about a week (project_structure.md §2.5): approve, send back, the
// review desk and its count, and every comment thread — on a day or on the week. One
// service owns thread writes, so the 10-minute rule, the reply rules and `interactionAt`
// live in one place. Load, then authorize (tech_stack.md §3.1).

const oid = (id) => new mongoose.Types.ObjectId(String(id));
const sameId = (a, b) => String(a) === String(b);
const NAME_ORDER = { sensitivity: "base" };

// ---------------------------------------------------------------- errors

const reportNotFound = () =>
  new AppError(404, "That report doesn't exist.", "REPORT_NOT_FOUND");
const reportForbidden = () =>
  new AppError(
    403,
    "You don't have access to this report.",
    "REPORT_FORBIDDEN",
  );
const threadNotFound = () =>
  new AppError(404, "That comment doesn't exist.", "THREAD_NOT_FOUND");
const commentNotAllowed = () =>
  new AppError(403, "You can't comment here.", "COMMENT_NOT_ALLOWED");
const editWindowClosed = () =>
  new AppError(
    403,
    "This comment can no longer be changed.",
    "EDIT_WINDOW_CLOSED",
  );
const hasReplies = () =>
  new AppError(409, "This comment can't be deleted.", "COMMENT_HAS_REPLIES");
const stateChanged = (status) =>
  new AppError(
    409,
    "This week has changed. Refresh and try again.",
    "REPORT_STATE_CHANGED",
    { status },
  );

// ---------------------------------------------------------------- loading

async function loadOpenable(actor, reportId) {
  const report = await Report.findById(reportId).lean();
  if (!report) throw reportNotFound();
  if (!canOpenWeek(actor, report)) throw reportForbidden();
  return report;
}

const reload = (report) => Report.findById(report._id).lean();

/**
 * Where a thread id lives in a report: `{ thread, day }` for a day's comment (`day` set)
 * or a week comment (`day` null); null when there is none.
 */
function locate(report, threadId) {
  const week = (report.weekComments ?? []).find((t) => sameId(t._id, threadId));
  if (week) return { thread: week, day: null };
  for (const day of report.days ?? []) {
    const thread = (day.comments ?? []).find((t) => sameId(t._id, threadId));
    if (thread) return { thread, day };
  }
  return null;
}

/** C3: who may write in a thread — the day's rule, or the author and staff on the week. */
function mayWriteIn(actor, report, { day }) {
  if (day) return canCommentOnDay(actor, report, day);
  return (
    canReadContent(actor, report) && (isAuthor(actor, report) || isStaff(actor))
  );
}

const entry = (actor, text, now) => ({
  _id: new mongoose.Types.ObjectId(),
  author: actor.id,
  text,
  createdAt: now,
  editedAt: null,
});

// A teammate writes on a day only while it is open; the filter re-checks it at write time.
const dayMatch = (actor, report, weekday) =>
  isAuthor(actor, report) || isStaff(actor)
    ? { weekday }
    : { weekday, openToTeam: true };

// ---------------------------------------------------------------- C1–C3: write

/** C1 — a new thread on a posted day. */
export async function commentOnDay(actor, reportId, weekday, { text }) {
  const report = await loadOpenable(actor, reportId);
  const day = (report.days ?? []).find((d) => d.weekday === weekday);
  if (!day) throw reportNotFound();
  if (!canCommentOnDay(actor, report, day)) throw commentNotAllowed();

  const now = new Date();
  const result = await Report.updateOne(
    { _id: report._id, days: { $elemMatch: dayMatch(actor, report, weekday) } },
    {
      $push: { "days.$.comments": { ...entry(actor, text, now), replies: [] } },
      $set: { interactionAt: now },
    },
  );
  if (result.matchedCount === 0) {
    const current = await reload(report);
    if (!current?.days?.some((d) => d.weekday === weekday))
      throw reportNotFound();
    throw commentNotAllowed(); // closed to the team meanwhile
  }
  return reportService.dayView(actor, await reload(report), weekday);
}

/** C2 — a manager or admin opens a thread on someone else's submitted week. */
export async function commentOnWeek(actor, reportId, { text }) {
  const report = await loadOpenable(actor, reportId);
  if (isAuthor(actor, report)) throw commentNotAllowed();
  if (!canCommentOnWeek(actor, report)) throw stateChanged(report.status);

  const now = new Date();
  const result = await Report.updateOne(
    {
      _id: report._id,
      status: { $ne: "draft" },
      revisionNumber: report.revisionNumber,
    },
    {
      $push: {
        weekComments: {
          ...entry(actor, text, now),
          replies: [],
          revisionNumber: report.revisionNumber,
          kind: "comment",
        },
      },
      $set: { interactionAt: now },
    },
  );
  if (result.matchedCount === 0)
    throw stateChanged((await reload(report))?.status);
  return reportService.weekCommentsView(actor, await reload(report));
}

/** C3 — a reply in a day or week thread, by anyone who may write there. */
export async function reply(actor, reportId, threadId, { text }) {
  const report = await loadOpenable(actor, reportId);
  const found = locate(report, threadId);
  if (!found) throw threadNotFound();
  if (!mayWriteIn(actor, report, found)) throw commentNotAllowed();

  const now = new Date();
  const id = oid(threadId);
  const result = found.day
    ? await Report.updateOne(
        {
          _id: report._id,
          days: {
            $elemMatch: {
              ...dayMatch(actor, report, found.day.weekday),
              "comments._id": id,
            },
          },
        },
        {
          $push: { "days.$[d].comments.$[t].replies": entry(actor, text, now) },
          $set: { interactionAt: now },
        },
        {
          arrayFilters: [{ "d.weekday": found.day.weekday }, { "t._id": id }],
        },
      )
    : await Report.updateOne(
        { _id: report._id, "weekComments._id": id },
        {
          $push: { "weekComments.$.replies": entry(actor, text, now) },
          $set: { interactionAt: now },
        },
      );
  if (result.matchedCount === 0) {
    const current = await reload(report);
    if (!locate(current, threadId)) throw threadNotFound();
    throw commentNotAllowed();
  }
  return reportService.threadView(actor, await reload(report), threadId);
}

// ---------------------------------------------------------------- C4, C5: the writer, 10 minutes

/**
 * The comment or reply a C4/C5 path names, checked against the writer and the window on
 * the server's clock. `target` is the thread itself or one of its replies.
 */
function editable(actor, report, threadId, replyId, now) {
  const found = locate(report, threadId);
  if (!found) throw threadNotFound();
  const target = replyId
    ? (found.thread.replies ?? []).find((r) => sameId(r._id, replyId))
    : found.thread;
  if (!target) throw threadNotFound();
  if (!canEditOwnComment(actor, target, now)) throw editWindowClosed();
  return { ...found, target };
}

/**
 * The Mongo filter that matches the report only while the target is still the actor's,
 * inside its window — and, for `extra`, still in a deletable state.
 */
function targetFilter(
  actor,
  report,
  { day },
  threadId,
  replyId,
  now,
  extra = {},
) {
  const mine = {
    author: actor.id,
    createdAt: { $gt: new Date(now.getTime() - EDIT_WINDOW_MS) },
  };
  const threadMatch = replyId
    ? {
        _id: oid(threadId),
        replies: { $elemMatch: { _id: oid(replyId), ...mine } },
      }
    : { _id: oid(threadId), ...mine, ...extra };
  return day
    ? {
        _id: report._id,
        days: {
          $elemMatch: {
            weekday: day.weekday,
            comments: { $elemMatch: threadMatch },
          },
        },
      }
    : { _id: report._id, weekComments: { $elemMatch: threadMatch } };
}

/** After a conditioned write matched nothing, say why. */
async function whyMissed(actor, report, threadId, replyId, now) {
  const current = await reload(report);
  editable(actor, current, threadId, replyId, now); // throws 404 or 403
  // Still the writer's and in time: a comment that gained a reply meanwhile.
  throw replyId ? threadNotFound() : hasReplies();
}

/** C4 — edit a comment (`replyId` null) or a reply. */
export async function editComment(
  actor,
  reportId,
  threadId,
  replyId,
  { text },
) {
  const report = await loadOpenable(actor, reportId);
  const now = new Date();
  const found = editable(actor, report, threadId, replyId, now);

  const base = found.day ? "days.$[d].comments.$[t]" : "weekComments.$[t]";
  const path = replyId ? `${base}.replies.$[r]` : base;
  const arrayFilters = [
    ...(found.day ? [{ "d.weekday": found.day.weekday }] : []),
    { "t._id": oid(threadId) },
    ...(replyId ? [{ "r._id": oid(replyId) }] : []),
  ];
  const result = await Report.updateOne(
    targetFilter(actor, report, found, threadId, replyId, now),
    { $set: { [`${path}.text`]: text, [`${path}.editedAt`]: now } },
    { arrayFilters },
  );
  if (result.matchedCount === 0) {
    const current = await reload(report);
    editable(actor, current, threadId, replyId, now);
    throw editWindowClosed();
  }
  return reportService.threadView(actor, await reload(report), threadId);
}

/**
 * C5 — delete a comment or a reply. A comment with replies, or a send-back comment,
 * stays (409): deleting it would leave replies answering nothing, or erase the reason a
 * report was sent back.
 */
export async function deleteComment(actor, reportId, threadId, replyId) {
  const report = await loadOpenable(actor, reportId);
  const now = new Date();
  const found = editable(actor, report, threadId, replyId, now);
  if (
    !replyId &&
    ((found.thread.replies ?? []).length > 0 ||
      found.thread.kind === "send_back")
  )
    throw hasReplies();

  const deletable = { replies: { $size: 0 }, kind: { $ne: "send_back" } };
  const filter = targetFilter(
    actor,
    report,
    found,
    threadId,
    replyId,
    now,
    deletable,
  );
  let update;
  let options = {};
  if (replyId) {
    const base = found.day ? "days.$[d].comments.$[t]" : "weekComments.$[t]";
    update = { $pull: { [`${base}.replies`]: { _id: oid(replyId) } } };
    options = {
      arrayFilters: [
        ...(found.day ? [{ "d.weekday": found.day.weekday }] : []),
        { "t._id": oid(threadId) },
      ],
    };
  } else if (found.day) {
    update = { $pull: { "days.$[d].comments": { _id: oid(threadId) } } };
    options = { arrayFilters: [{ "d.weekday": found.day.weekday }] };
  } else {
    update = { $pull: { weekComments: { _id: oid(threadId) } } };
  }
  const result = await Report.updateOne(filter, update, options);
  if (result.matchedCount === 0)
    await whyMissed(actor, report, threadId, replyId, now);

  const saved = await reload(report);
  return found.day
    ? reportService.dayView(actor, saved, found.day.weekday)
    : reportService.weekCommentsView(actor, saved);
}

// ---------------------------------------------------------------- V1, V2: review

/**
 * Approve or send back (database_schema.md §3.3). The pinned revision is claimed first,
 * conditioned on `action: null` — of two reviewers, or a reviewer holding a stale pin,
 * exactly one matches. The report follows, conditioned on the same revision.
 */
async function review(actor, reportId, { revisionNumber, comment, action }) {
  const report = await loadOpenable(actor, reportId);
  if (isAuthor(actor, report))
    throw new AppError(
      403,
      "You can't review your own report.",
      "SELF_REVIEW_FORBIDDEN",
    );
  if (report.status !== "submitted" || report.revisionNumber !== revisionNumber)
    throw stateChanged(report.status);

  const now = new Date();
  const text = comment ? comment : null;
  const claimed = await Revision.updateOne(
    { report: report._id, revisionNumber, action: null },
    {
      $set: {
        action,
        ...(text && { comment: text }),
        reviewedBy: actor.id,
        reviewedAt: now,
      },
    },
  );
  if (claimed.matchedCount === 0)
    throw stateChanged((await reload(report))?.status);

  const sendingBack = action === "changes_requested";
  const thread = text && {
    ...entry(actor, text, now),
    replies: [],
    revisionNumber,
    kind: sendingBack ? "send_back" : "approval",
  };
  const updated = await Report.findOneAndUpdate(
    { _id: report._id, status: "submitted", revisionNumber },
    {
      $set: {
        status: sendingBack ? "needs_correction" : "approved",
        lastActivityAt: now,
        interactionAt: now,
        latestComment: sendingBack
          ? { text, author: actor.id, revisionNumber, createdAt: now }
          : null,
      },
      ...(thread && { $push: { weekComments: thread } }),
    },
    { new: true },
  ).lean();
  if (!updated) throw stateChanged((await reload(report))?.status);
  return reportService.weekViewOf(actor, updated);
}

/** V1 — any submitted report, asked for approval or not (I16). */
export async function approve(actor, reportId, { revisionNumber, comment }) {
  return review(actor, reportId, {
    revisionNumber,
    comment,
    action: "approved",
  });
}

/** V2 — the comment is required (10–2000, checked by the validator). */
export async function sendBack(actor, reportId, { revisionNumber, comment }) {
  return review(actor, reportId, {
    revisionNumber,
    comment,
    action: "changes_requested",
  });
}

// ---------------------------------------------------------------- V3, V4: the review desk

const projectRef = (p) => p && { _id: p._id, name: p.name, status: p.status };

/** V3's filters beside the desk's base scope; null when nothing can match. */
async function deskFilter(actor, query) {
  const and = [reviewDeskScope(actor, { approval: query.approval })];
  if (query.person) and.push({ author: { $in: query.person.map(oid) } });
  if (query.role) {
    const ids = await User.find({ role: { $in: query.role } })
      .select("_id")
      .lean();
    and.push({ author: { $in: ids.map((u) => u._id) } });
  }
  if (query.project)
    and.push({ "days.lines.project": { $in: query.project.map(oid) } });
  if (query.weekFrom) and.push({ weekKey: { $gte: query.weekFrom } });
  if (query.weekTo) and.push({ weekKey: { $lte: query.weekTo } });
  return { $and: and };
}

/** V3 — submitted reports, never the actor's own, under every filter combination. */
export async function reviewDesk(actor, query) {
  const filter = await deskFilter(actor, query);
  const dir = query.dir === "desc" ? -1 : 1;
  const window = pageWindow(query);
  const [total, reports] = await Promise.all([
    Report.countDocuments(filter),
    Report.find(filter)
      .select(
        "author weekKey weekStart weekEnd status approvalRequested revisionNumber submittedAt days.lines.project",
      )
      .sort({ [query.sort]: dir, weekKey: dir, _id: dir })
      .skip(window.skip)
      .limit(window.limit)
      .populate("author", "name role status leave")
      .populate("days.lines.project", "name status")
      .lean(),
  ]);
  const fresh = await markerService.newReportIds(
    actor,
    reports.map((r) => r._id),
  );
  const items = reports.map((r) => {
    const projects = new Map();
    for (const line of (r.days ?? []).flatMap((d) => d.lines ?? []))
      if (line.project)
        projects.set(String(line.project._id), projectRef(line.project));
    return {
      _id: r._id,
      author: r.author ? userRef(r.author) : null,
      projects: [...projects.values()].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, NAME_ORDER),
      ),
      weekKey: r.weekKey,
      weekStart: toDateString(r.weekStart),
      weekEnd: toDateString(r.weekEnd),
      status: r.status,
      approvalRequested: !!r.approvalRequested,
      revisionNumber: r.revisionNumber,
      submittedAt: r.submittedAt ?? null,
      isNew: fresh.has(String(r._id)),
    };
  });
  return paginated(items, { ...query, total });
}

/** V4 — requested reports this manager hasn't opened since their latest submission. */
export async function reviewDeskCount(actor) {
  return { count: await markerService.reviewRequestCount(actor) };
}
