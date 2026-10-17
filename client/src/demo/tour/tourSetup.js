import { WEEKDAYS } from "../../lib/constants.js";
import { addWeeks, currentWeekKey, weekDays } from "../../lib/dates.js";
import { matchRoute } from "../demoRoutes.js";
import { dayStatesOf } from "../demoWeekView.js";
import { CAST, SAMPLE_PROJECTS } from "../fixtures.js";

// The guided tour's demo-store setup helpers (owner request, 2026-10-17). A step names
// the state it needs; each helper here makes sure the store is in that state and says
// whether it changed anything, so the tour knows to refetch. They act through the demo's
// own route handlers wherever a real action exists (submit, send back, approve…), as the
// person who would do it, so revisions, comments and the review desk come out exactly as
// the visitor's own clicks would leave them. Pure: they take the store, no React.
//
// The story week is Imali's last week: every day of it is posted, so it can be filed on
// any day of the week. It moves Draft → Submitted → Needs correction → Submitted (rev 2)
// → Approved as the tour goes, and any step can ask for any of those states.

const SEND_BACK_TEXT =
  "Thursday’s testing hours aren’t in the notes. Add them and resubmit, please.";
const RESUBMIT_NOTE =
  "Thursday: 7 h of testing on the card, wallet and refund paths.";
const ACHIEVEMENT = "Payments work end to end on the test site";
const TEAM_COMMENT = "Nice work on the launch copy.";
const LINE_TEXT = "Delivery dates on the shipping options screen";
const OPEN = ["draft", "needs_correction"];

/** What the steps read: the weeks, everyone's id and the days the story uses. */
export function tourContext(store, now = new Date()) {
  const thisWeek = currentWeekKey(now);
  const lastWeek = addWeeks(thisWeek, -1);
  const ctx = { store, now, thisWeek, lastWeek, ids: CAST };
  const projects = SAMPLE_PROJECTS;
  return {
    ...ctx,
    projects,
    storyId: story(ctx)?._id ?? null,
    openDay: openDayOf(ctx),
    teamDay: latestPostedDay(ctx, CAST.ayesha),
    postedDay: latestPostedDay(ctx, CAST.imali),
    managerDay: latestPostedDay(ctx, CAST.ruwan),
    storyAsked: Boolean(story(ctx)?.approvalRequested),
    replyDay: replyDayOf(ctx),
  };
}

// ---------------------------------------------------------------- reads

const reportOf = ({ store }, author, weekKey) =>
  store.reports.find((r) => r.author === author && r.weekKey === weekKey) ??
  null;
const story = (ctx) => reportOf(ctx, CAST.imali, ctx.lastWeek);
const userOf = ({ store }, id) => store.users.find((u) => u._id === id);

function statesOf(ctx, userId, weekKey) {
  const report = reportOf(ctx, userId, weekKey);
  return dayStatesOf(
    ctx.store,
    userOf(ctx, userId),
    report,
    weekKey,
    ctx.now.getTime(),
  );
}

/** Imali's day to write this week: today if it is open, else the latest missing day. */
function openDayOf(ctx) {
  const states = statesOf(ctx, CAST.imali, ctx.thisWeek);
  const today = WEEKDAYS.find((d) => states[d] === "today");
  if (today) return today;
  return WEEKDAYS.filter((d) => states[d] === "missing").at(-1) ?? null;
}

/** Someone's latest posted day this week, or null. */
function latestPostedDay(ctx, userId) {
  const report = reportOf(ctx, userId, ctx.thisWeek);
  const posted = new Set(report?.days.map((d) => d.weekday));
  return WEEKDAYS.filter((d) => posted.has(d)).at(-1) ?? null;
}

/** The day of Imali's story week that carries a comment from Nadia. */
function replyDayOf(ctx) {
  const report = story(ctx);
  const day = report?.days.find((d) =>
    d.comments.some((t) => t.author === CAST.nadia),
  );
  return day?.weekday ?? null;
}

// ---------------------------------------------------------------- acting as someone

/** One request, answered by the demo's handler as `userId`. Throws on a refusal. */
function act(store, userId, method, url, body = {}) {
  const before = store.session.userId;
  store.session.userId = userId;
  try {
    const route = matchRoute(method, url);
    const result = route.handler(store, {
      params: route.params,
      query: {},
      body,
    });
    if (result.status >= 400) {
      throw new Error(`${result.error.code}: ${result.error.message}`);
    }
    return result.data;
  } finally {
    store.session.userId = before;
  }
}

// A filed report back to a Draft: no versions, no decisions, nothing written at the end
// of the week. The days and their comments stay — they are the week.
function resetToDraft(report) {
  Object.assign(report, {
    status: "draft",
    approvalRequested: false,
    revisionNumber: 0,
    submittedAt: null,
    lastActivityAt: null,
    updatedAt: new Date().toISOString(),
    latestComment: null,
    revisions: [],
    weekComments: [],
    blockerResolutions: [],
  });
  report.content = {
    tasks: report.content.tasks.map((t) => ({
      taskId: t.taskId,
      status: null,
      note: "",
    })),
    nextWeek: [],
    achievements: [],
    notes: "",
    links: [],
  };
}

function fillAndSubmit(ctx, report) {
  const unset = report.content.tasks.filter((t) => !t.status);
  act(ctx.store, CAST.imali, "patch", `/reports/${report._id}`, {
    tasks: unset.map((t) => ({ task: t.taskId, status: "in_progress" })),
    ...(report.content.achievements.length === 0 && {
      achievements: [{ text: ACHIEVEMENT, isKey: true }],
    }),
  });
  act(ctx.store, CAST.imali, "post", `/reports/${report._id}/submit`, {
    requestApproval: true,
  });
}

function decide(ctx, report, action, comment) {
  act(
    ctx.store,
    CAST.nadia,
    "post",
    `/reports/${report._id}/review/${action}`,
    { revisionNumber: report.revisionNumber, comment },
  );
}

// ---------------------------------------------------------------- the helpers

function storyDraft(ctx) {
  const report = story(ctx);
  if (report.status === "draft") return false;
  resetToDraft(report);
  return true;
}

function storySubmitted(ctx) {
  const report = story(ctx);
  if (report.status === "submitted") return false;
  if (report.status === "approved") resetToDraft(report);
  if (report.status === "needs_correction") {
    act(ctx.store, CAST.imali, "post", `/reports/${report._id}/submit`, {
      requestApproval: true,
    });
  } else {
    fillAndSubmit(ctx, report);
  }
  return true;
}

function storySentBack(ctx) {
  const report = story(ctx);
  if (report.status === "needs_correction") return false;
  storySubmitted(ctx);
  decide(ctx, report, "send-back", SEND_BACK_TEXT);
  return true;
}

// Submitted again after a send-back, so there are two versions to read.
function storyResubmitted(ctx) {
  const report = story(ctx);
  if (report.status === "submitted" && report.revisionNumber >= 2) return false;
  storySentBack(ctx);
  act(ctx.store, CAST.imali, "patch", `/reports/${report._id}`, {
    notes: [report.content.notes, RESUBMIT_NOTE].filter(Boolean).join("\n"),
  });
  act(ctx.store, CAST.imali, "post", `/reports/${report._id}/submit`, {
    requestApproval: true,
  });
  return true;
}

function storyApproved(ctx) {
  const report = story(ctx);
  if (report.status === "approved") return false;
  if (report.status !== "submitted") storyResubmitted(ctx);
  decide(ctx, report, "approve");
  return true;
}

// Imali's week is open to writing: Imali isn't on leave, and this week isn't filed.
function imaliWeekOpen(ctx) {
  let changed = false;
  const imali = userOf(ctx, CAST.imali);
  if (imali.onLeave) {
    act(ctx.store, CAST.imali, "put", `/users/${CAST.imali}/leave`, {
      onLeave: false,
    });
    changed = true;
  }
  const report = reportOf(ctx, CAST.imali, ctx.thisWeek);
  if (report && !OPEN.includes(report.status)) {
    resetToDraft(report);
    changed = true;
  }
  return changed;
}

// Imali can write a day this week: the week open, and a day that is today or missing.
// When every day behind us is posted (always on a Monday, where the sample week starts
// posted, and at the weekend), the latest one is taken back off.
function imaliCanPost(ctx) {
  const changed = imaliWeekOpen(ctx);
  if (openDayOf(ctx)) return changed;
  const report = reportOf(ctx, CAST.imali, ctx.thisWeek);
  const states = statesOf(ctx, CAST.imali, ctx.thisWeek);
  const latest = WEEKDAYS.filter((d) => states[d] === "posted").at(-1);
  const day = weekDays(ctx.thisWeek).find((d) => d.weekday === latest);
  if (!report || !day || day.date > ctx.now) return changed;
  report.days = report.days.filter((d) => d.weekday !== latest);
  return true;
}

// A day of Imali's this week is posted, so there is one to edit: the open day, written
// for the visitor when the step that posts it was skipped.
function imaliHasPosted(ctx) {
  const changed = imaliWeekOpen(ctx);
  if (latestPostedDay(ctx, CAST.imali)) return changed;
  const weekday = openDayOf(ctx);
  const task = ctx.store.tasks.find((t) => t.owner === CAST.imali && !t.doneAt);
  if (!weekday || !task) return changed;
  act(
    ctx.store,
    CAST.imali,
    "put",
    `/reports/week/${ctx.thisWeek}/days/${weekday}`,
    {
      lines: [
        { task: task._id, taskType: "development", text: LINE_TEXT, hours: 4 },
      ],
      blockers: [],
      openToTeam: false,
    },
  );
  return true;
}

// Ayesha's latest day this week is open to team comments, so Imali may comment on it.
function teamDayOpen(ctx) {
  const weekday = latestPostedDay(ctx, CAST.ayesha);
  const day = reportOf(ctx, CAST.ayesha, ctx.thisWeek)?.days.find(
    (d) => d.weekday === weekday,
  );
  if (!day || day.openToTeam) return false;
  day.openToTeam = true;
  return true;
}

// A comment of Imali's on that day, young enough to still be edited.
function imaliTeamComment(ctx) {
  let changed = teamDayOpen(ctx);
  const weekday = latestPostedDay(ctx, CAST.ayesha);
  const report = reportOf(ctx, CAST.ayesha, ctx.thisWeek);
  const day = report?.days.find((d) => d.weekday === weekday);
  if (!day) return changed;
  const fresh = Date.now() - 9 * 60_000;
  const mine = day.comments.some(
    (t) => t.author === CAST.imali && new Date(t.createdAt).getTime() > fresh,
  );
  if (!mine) {
    act(
      ctx.store,
      CAST.imali,
      "post",
      `/reports/${report._id}/days/${weekday}/comments`,
      { text: TEAM_COMMENT },
    );
    changed = true;
  }
  return changed;
}

export const SETUP = {
  storyDraft,
  storySubmitted,
  storySentBack,
  storyResubmitted,
  storyApproved,
  imaliCanPost,
  imaliHasPosted,
  teamDayOpen,
  imaliTeamComment,
};

/** Runs a step's helpers in order; true when the store changed. */
export function prepare(store, names = [], now = new Date()) {
  let changed = false;
  for (const name of names) {
    if (SETUP[name](tourContext(store, now))) changed = true;
  }
  return changed;
}

// ---------------------------------------------------------------- what the steps wait for

/** Has the story week reached `status` (and, for a resubmit, a later version)? */
export function storyIs(ctx, status, minRevision = 0) {
  const report = story(ctx);
  return report?.status === status && report.revisionNumber >= minRevision;
}

/** Has Imali posted `weekday` this week? */
export function imaliPosted(ctx, weekday) {
  return Boolean(
    reportOf(ctx, CAST.imali, ctx.thisWeek)?.days.some(
      (d) => d.weekday === weekday,
    ),
  );
}

/** Comments by `author` in a day's threads (replies included) since `since`. */
export function commentsSince(ctx, ownerId, weekKey, weekday, author, since) {
  const day = reportOf(ctx, ownerId, weekKey)?.days.find(
    (d) => d.weekday === weekday,
  );
  if (!day) return 0;
  const all = day.comments.flatMap((t) => [t, ...t.replies]);
  return all.filter(
    (c) => c.author === author && new Date(c.createdAt).getTime() >= since,
  ).length;
}

export const TOUR_TEXT = {
  sendBack: SEND_BACK_TEXT,
  resubmitNote: RESUBMIT_NOTE,
  teamComment: TEAM_COMMENT,
  reply: "Shared them in the channel this morning.",
  managerComment: "Thanks for the update on the migration.",
  weekComment: "Good detail on the payments work.",
  line: LINE_TEXT,
};

/** An invite address nobody on the team has yet: new.colleague@…, then 2, 3… */
export function freeInviteEmail(store) {
  const taken = new Set(store.users.map((u) => u.email));
  for (let n = 1; ; n += 1) {
    const email = `new.colleague${n === 1 ? "" : n}@example.com`;
    if (!taken.has(email)) return email;
  }
}
