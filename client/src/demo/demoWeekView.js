import { addMinutes, parseISO } from "date-fns";
import { TASK_TYPES, WEEKDAYS, WEEKDAY_LABELS } from "../lib/constants.js";
import { addWeeks, toCalendarDate, weekDays } from "../lib/dates.js";

// The demo's WeekView: what the API computes from stored documents, computed from the
// store (frontend_architecture.md §11.3 — the adapter computes every derived field the
// pages read). It mirrors api_specification.md §1.10 and the policies of §3; a page
// that works against the real API and breaks here is a demo bug.

export const EDIT_WINDOW_MINUTES = 10;

const isManager = (user) => user.role === "manager" || user.role === "admin";
const isAuthor = (user, report) => report.author === user._id;
const sum = (items) => items.reduce((total, n) => total + n, 0);
const OPEN = ["draft", "needs_correction"];

// ---------------------------------------------------------------- refs

export function userRef(store, id) {
  const user = store.users.find((u) => u._id === id);
  return user
    ? {
        _id: user._id,
        name: user.name,
        role: user.role,
        status: user.status,
        onLeave: user.onLeave,
      }
    : null;
}

function projectRef(store, id) {
  const project = store.projects.find((p) => p._id === id);
  return project
    ? { _id: project._id, name: project.name, status: project.status }
    : null;
}

function taskRef(store, id) {
  const task = store.tasks.find((t) => t._id === id);
  return task
    ? {
        _id: task._id,
        name: task.name,
        project: projectRef(store, task.project),
      }
    : null;
}

// ---------------------------------------------------------------- policies (§3)

/** canReadContent: the author, or a manager or admin once the report is submitted. */
export const canReadContent = (actor, report) =>
  isAuthor(actor, report) || (isManager(actor) && report.status !== "draft");

/** I13: live for the author; the sent-back version for a manager on Needs correction. */
export function contentSourceFor(actor, report) {
  if (!canReadContent(actor, report)) return "withheld";
  if (isAuthor(actor, report)) return "live";
  return report.status === "needs_correction" ? "revision" : "live";
}

/** canCommentOnDay: the author, any manager or admin, or anyone while the day is open. */
export const canCommentOnDay = (actor, report, day) =>
  isAuthor(actor, report) || isManager(actor) || day.openToTeam;

export const canResolveBlocker = (actor, report) =>
  isAuthor(actor, report) || isManager(actor);

export const canToggleTeamComments = canResolveBlocker;

export const isEditable = (thread, actor, now = Date.now()) =>
  thread.author === actor._id &&
  now < addMinutes(parseISO(thread.createdAt), EDIT_WINDOW_MINUTES).getTime();

// ---------------------------------------------------------------- "new" (§5.4)

const seenAt = (store, report, actor) =>
  store.seen[`${report._id}:${actor._id}`] ?? null;

// Simplified from database_schema.md §5.4: an entry by someone else, after the reader
// last opened the week, in a thread on a report that concerns them (their own) or in a
// thread they wrote in.
function isThreadNew(store, report, thread, actor) {
  const seen = seenAt(store, report, actor);
  const entries = [thread, ...thread.replies];
  const wroteIn = entries.some((e) => e.author === actor._id);
  if (!isAuthor(actor, report) && !wroteIn) return false;
  return entries.some(
    (e) => e.author !== actor._id && (!seen || e.createdAt > seen),
  );
}

// ---------------------------------------------------------------- shapes

function entryOut(store, entry) {
  return {
    _id: entry._id,
    author: userRef(store, entry.author),
    text: entry.text,
    createdAt: entry.createdAt,
    editedAt: entry.editedAt ?? null,
    editableUntil: addMinutes(
      parseISO(entry.createdAt),
      EDIT_WINDOW_MINUTES,
    ).toISOString(),
  };
}

export function threadOut(store, actor, report, thread, { week }) {
  return {
    ...entryOut(store, thread),
    revisionNumber: week ? (thread.revisionNumber ?? null) : null,
    kind: week ? (thread.kind ?? "comment") : null,
    replies: thread.replies.map((r) => entryOut(store, r)),
    isNew: isThreadNew(store, report, thread, actor),
  };
}

const normalise = (text) => text.trim().replace(/\s+/g, " ").toLowerCase();

function previousBlockerTexts(store, report) {
  const previousWeek = addWeeks(report.weekKey, -1);
  const previous = store.reports.find(
    (r) => r.author === report.author && r.weekKey === previousWeek,
  );
  return new Set(
    (previous?.days ?? []).flatMap((d) =>
      d.blockers.map((b) => normalise(b.text)),
    ),
  );
}

export function dayOut(store, actor, report, day) {
  const resolutions = new Map(
    report.blockerResolutions.map((r) => [r.blockerId, r]),
  );
  const carried = previousBlockerTexts(store, report);
  return {
    weekday: day.weekday,
    lines: day.lines.map((line) => ({
      _id: line._id,
      task: taskRef(store, line.taskId),
      taskType: line.taskType,
      text: line.text,
      hours: line.hours,
    })),
    blockers: day.blockers.map((blocker) => {
      const resolution = resolutions.get(blocker._id);
      return {
        _id: blocker._id,
        text: blocker.text,
        isKey: blocker.isKey,
        resolvedAt: resolution?.resolvedAt ?? null,
        resolvedBy: resolution ? userRef(store, resolution.resolvedBy) : null,
        carriedOver: carried.has(normalise(blocker.text)),
      };
    }),
    openToTeam: day.openToTeam,
    postedAt: day.postedAt,
    editedAt: day.editedAt,
    hours: sum(day.lines.map((l) => l.hours)),
    comments: day.comments.map((t) =>
      threadOut(store, actor, report, t, { week: false }),
    ),
    canComment: canCommentOnDay(actor, report, day),
  };
}

const sortedDays = (days) =>
  [...days].sort(
    (a, b) => WEEKDAYS.indexOf(a.weekday) - WEEKDAYS.indexOf(b.weekday),
  );

const linesOf = (report) => report.days.flatMap((d) => d.lines);

function servedContent(store, actor, report) {
  const source = contentSourceFor(actor, report);
  if (source === "withheld") return { source, content: null, number: null };
  if (source === "live")
    return { source, content: report.content, number: null };
  const revision = report.revisions.find(
    (r) => r.revisionNumber === report.revisionNumber,
  );
  return { source, content: revision.content, number: report.revisionNumber };
}

function submitRules(report, expectedDays) {
  const posted = new Set(report.days.map((d) => d.weekday));
  const messages = expectedDays
    .filter((d) => !posted.has(d))
    .map((d) => `${WEEKDAY_LABELS[d]} has no update.`);
  const noStatus = report.content.tasks.filter((t) => !t.status).length;
  if (noStatus === 1) messages.push("One task has no status.");
  if (noStatus > 1) messages.push(`${noStatus} tasks have no status.`);
  return messages;
}

function reportOut(store, actor, report, expectedDays) {
  const readable = canReadContent(actor, report);
  const served = servedContent(store, actor, report);
  const servedTasks = new Map(
    (served.content?.tasks ?? []).map((t) => [t.taskId, t]),
  );
  const hoursByTask = new Map();
  const hoursByType = Object.fromEntries(TASK_TYPES.map((t) => [t, 0]));
  for (const line of linesOf(report)) {
    hoursByTask.set(
      line.taskId,
      (hoursByTask.get(line.taskId) ?? 0) + line.hours,
    );
    hoursByType[line.taskType] += line.hours;
  }
  const author = isAuthor(actor, report);
  const messages = author ? submitRules(report, expectedDays) : null;

  return {
    _id: report._id,
    author: userRef(store, report.author),
    weekKey: report.weekKey,
    weekStart: toCalendarDate(weekDays(report.weekKey)[0].date),
    weekEnd: toCalendarDate(weekDays(report.weekKey)[4].date),
    status: report.status,
    approvalRequested: report.approvalRequested,
    revisionNumber: report.revisionNumber,
    submittedAt: report.submittedAt,
    lastActivityAt: report.lastActivityAt,
    updatedAt: report.lastActivityAt,
    days: sortedDays(report.days).map((d) => dayOut(store, actor, report, d)),
    // Rows follow the live lines; status and note come from the served content.
    tasks: [...hoursByTask].map(([taskId, hours]) => ({
      task: taskRef(store, taskId),
      hours,
      status: served.content ? (servedTasks.get(taskId)?.status ?? null) : null,
      note: served.content ? (servedTasks.get(taskId)?.note ?? null) : null,
    })),
    hoursByType,
    contentSource: served.source,
    contentRevisionNumber: served.number,
    content: served.content
      ? {
          nextWeek: served.content.nextWeek,
          achievements: served.content.achievements,
          notes: served.content.notes,
          links: served.content.links,
        }
      : null,
    weekComments: readable
      ? report.weekComments.map((t) =>
          threadOut(store, actor, report, t, { week: true }),
        )
      : null,
    latestComment:
      readable && report.latestComment
        ? {
            ...report.latestComment,
            author: userRef(store, report.latestComment.author),
          }
        : null,
    canSubmit: author
      ? OPEN.includes(report.status) && messages.length === 0
      : null,
    submitBlockers: author
      ? OPEN.includes(report.status)
        ? messages
        : []
      : null,
  };
}

/** `dayStates` on the browser's clock — the demo has no other. */
function dayStatesOf(report, weekKey, now) {
  const posted = new Set((report?.days ?? []).map((d) => d.weekday));
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Object.fromEntries(
    weekDays(weekKey).map(({ weekday, date }) => {
      if (posted.has(weekday)) return [weekday, "posted"];
      if (date > today) return [weekday, "future"];
      return [
        weekday,
        date.getTime() === today.getTime() ? "today" : "missing",
      ];
    }),
  );
}

/** A WeekView of `user`'s week for `actor`; `report` may be undefined (I3). */
export function weekViewOf(
  store,
  actor,
  user,
  weekKey,
  report,
  now = Date.now(),
) {
  const days = weekDays(weekKey);
  return {
    user: userRef(store, user._id),
    weekKey,
    weekStart: toCalendarDate(days[0].date),
    weekEnd: toCalendarDate(days[4].date),
    expectedDays: [...WEEKDAYS],
    dayStates: dayStatesOf(report, weekKey, now),
    state: report ? report.status : "not_started",
    report: report ? reportOut(store, actor, report, [...WEEKDAYS]) : null,
  };
}

// ---------------------------------------------------------------- revisions (R8, R9)

function revisionSummary(store, report, revision) {
  return {
    revisionNumber: revision.revisionNumber,
    isCurrent: revision.revisionNumber === report.revisionNumber,
    approvalRequested: revision.approvalRequested,
    submittedAt: revision.submittedAt,
    submittedBy: userRef(store, revision.submittedBy),
    action: revision.action,
    comment: revision.comment,
    reviewedBy: revision.reviewedBy
      ? userRef(store, revision.reviewedBy)
      : null,
    reviewedAt: revision.reviewedAt,
  };
}

export const revisionListOf = (store, report) => ({
  items: [...report.revisions]
    .sort((a, b) => b.revisionNumber - a.revisionNumber)
    .map((r) => revisionSummary(store, report, r)),
});

export function revisionOf(store, report, revision) {
  return {
    ...revisionSummary(store, report, revision),
    content: {
      tasks: revision.content.tasks.map((t) => ({
        task: taskRef(store, t.taskId),
        status: t.status,
        note: t.note,
      })),
      nextWeek: revision.content.nextWeek,
      achievements: revision.content.achievements,
      notes: revision.content.notes,
      links: revision.content.links,
    },
    days: sortedDays(revision.days).map((day) => ({
      weekday: day.weekday,
      lines: day.lines.map((line) => ({
        _id: line._id,
        task: taskRef(store, line.taskId),
        taskType: line.taskType,
        text: line.text,
        hours: line.hours,
      })),
      blockers: day.blockers.map((b) => ({
        _id: b._id,
        text: b.text,
        isKey: b.isKey,
      })),
      openToTeam: day.openToTeam,
      postedAt: day.postedAt,
      editedAt: day.editedAt,
      hours: sum(day.lines.map((l) => l.hours)),
    })),
  };
}
