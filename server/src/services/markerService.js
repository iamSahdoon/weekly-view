import { Report } from "../models/reportModel.js";
import { SeenMark } from "../models/seenMarkModel.js";
import {
  canOpenWeek,
  canReadContent,
  isAuthor,
  isStaff,
  reviewDeskScope,
} from "../policies/reportPolicy.js";
import { AppError } from "../utils/appError.js";
import { shiftWeek, weekKeyOf } from "../utils/weeks.js";
import { todayUtc } from "./calendarService.js";

// "New" markers (database_schema.md §1.10, §5.4): seen marks, `isNew` for rows and
// threads, and the sidebar dots. Nothing is stored per notification — a report's activity
// is compared with the reader's `seenAt`. It never decides access: callers pass only what
// the reader may already see, and week threads count only where canReadContent allows.

const HOUR_MS = 60 * 60 * 1000;
const NAV_WEEKS = 12;

const sameId = (a, b) => String(a?._id ?? a) === String(b?._id ?? b);
const after = (at, seenAt) => !!at && (!seenAt || new Date(at) > seenAt);
const entriesOf = (thread) => [thread, ...(thread.replies ?? [])];

// Just what the predicates below read; never serialized.
const MARKER_FIELDS = [
  "author",
  "status",
  "approvalRequested",
  "submittedAt",
  "lastActivityAt",
  "interactionAt",
  ...["days.comments", "weekComments"].flatMap((path) => [
    `${path}.author`,
    `${path}.createdAt`,
    `${path}.replies.author`,
    `${path}.replies.createdAt`,
  ]),
].join(" ");

/** R13 — upserts the actor's mark on a week they may open. */
export async function markSeen(actor, reportId) {
  const report = await Report.findById(reportId).select("author status").lean();
  if (!report)
    throw new AppError(404, "That report doesn't exist.", "REPORT_NOT_FOUND");
  if (!canOpenWeek(actor, report))
    throw new AppError(
      403,
      "You don't have access to this report.",
      "REPORT_FORBIDDEN",
    );
  const write = () =>
    SeenMark.updateOne(
      { user: actor.id, report: report._id },
      { $set: { seenAt: new Date() } },
      { upsert: true },
    );
  try {
    await write();
  } catch (err) {
    // Two concurrent first opens: the loser's upsert hits { user, report }; retry once.
    if (err?.code !== 11000) throw err;
    await write();
  }
  return null;
}

/** The actor's `seenAt` per report id (absent: never opened). */
export async function seenAtByReport(actor, reportIds) {
  if (reportIds.length === 0) return new Map();
  const marks = await SeenMark.find({
    user: actor.id,
    report: { $in: reportIds },
  })
    .select("report seenAt")
    .lean();
  return new Map(marks.map((m) => [String(m.report), m.seenAt]));
}

/**
 * A thread is new for the actor when it concerns them — on their own report, or a thread
 * they have written in — and someone else wrote in it after their `seenAt`.
 */
export function isThreadNew(actor, report, thread, seenAt) {
  const entries = entriesOf(thread);
  const concerns =
    isAuthor(actor, report) || entries.some((e) => sameId(e.author, actor.id));
  return (
    concerns &&
    entries.some(
      (e) => !sameId(e.author, actor.id) && after(e.createdAt, seenAt),
    )
  );
}

/**
 * A report (a row) is new for the actor when its activity since their `seenAt` concerns
 * them: their report approved or sent back, an approval request (managers and admins), or
 * a new entry in a thread that concerns them.
 */
export function isReportNew(actor, report, seenAt) {
  if (seenAt && !after(report.interactionAt, seenAt)) return false;
  const author = isAuthor(actor, report);
  // Only a review sets these statuses, so the activity is someone else's.
  if (
    author &&
    ["approved", "needs_correction"].includes(report.status) &&
    after(report.lastActivityAt, seenAt)
  )
    return true;
  if (
    isStaff(actor) &&
    !author &&
    report.status === "submitted" &&
    report.approvalRequested &&
    after(report.submittedAt, seenAt)
  )
    return true;
  const threads = [
    ...(report.days ?? []).flatMap((d) => d.comments ?? []),
    ...(canReadContent(actor, report) ? (report.weekComments ?? []) : []),
  ];
  return threads.some((t) => isThreadNew(actor, report, t, seenAt));
}

/** The ids, among `reportIds` (one page of a list), that are new for the actor. */
export async function newReportIds(actor, reportIds) {
  if (reportIds.length === 0) return new Set();
  const [reports, seen] = await Promise.all([
    Report.find({ _id: { $in: reportIds } })
      .select(MARKER_FIELDS)
      .lean(),
    seenAtByReport(actor, reportIds),
  ]);
  return new Set(
    reports
      .filter((r) => isReportNew(actor, r, seen.get(String(r._id))))
      .map((r) => String(r._id)),
  );
}

/** V4 and N1: requested reports the actor hasn't opened since their latest submission. */
export async function reviewRequestCount(actor) {
  if (!isStaff(actor)) return 0;
  const reports = await Report.find(reviewDeskScope(actor))
    .select("submittedAt")
    .lean();
  const seen = await seenAtByReport(
    actor,
    reports.map((r) => r._id),
  );
  return reports.filter((r) => after(r.submittedAt, seen.get(String(r._id))))
    .length;
}

/**
 * N1 — the sidebar's dots, over the actor's own reports of the last 12 weeks. "This week"
 * is any week that is current somewhere on Earth (UTC−12 to UTC+14), since the server
 * has no client date (api_specification.md I2); "My reports" is the earlier weeks.
 */
export async function newMarks(actor, now = new Date()) {
  const weekAt = (offsetHours) =>
    weekKeyOf(todayUtc(new Date(now.getTime() + offsetHours * HOUR_MS)));
  const latest = weekAt(14);
  const earliest = weekAt(-12);
  const [reviewRequests, reports] = await Promise.all([
    reviewRequestCount(actor),
    Report.find({
      author: actor.id,
      weekKey: { $gte: shiftWeek(latest, -(NAV_WEEKS - 1)), $lte: latest },
    })
      .select(`weekKey ${MARKER_FIELDS}`)
      .lean(),
  ]);
  const seen = await seenAtByReport(
    actor,
    reports.map((r) => r._id),
  );
  const fresh = reports.filter((r) =>
    isReportNew(actor, r, seen.get(String(r._id))),
  );
  return {
    reviewRequests,
    nav: {
      thisWeek: fresh.some((r) => r.weekKey >= earliest),
      myReports: fresh.some((r) => r.weekKey < earliest),
    },
  };
}
