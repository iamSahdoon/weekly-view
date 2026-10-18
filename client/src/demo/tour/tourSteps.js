import { WEEKDAY_LABELS } from "../../lib/constants.js";
import {
  TOUR_TEXT,
  commentsSince,
  freeInviteEmail,
  imaliPosted,
  storyIs,
} from "./tourSetup.js";

// The guided tour's script (owner request, 2026-10-17): one team's week as a story, each
// feature explained once, in the chapter of the lowest role that has it. A step is data:
//
//   id          stable, for the jump panel and the tests
//   chapter     one of CHAPTERS
//   audience    who can use the feature: "everyone" | "managers" | "admins"
//   as          the demo person the step is seen as: "admin" | "member" | "manager"
//   title, body the tooltip: a short title and one or two plain sentences
//   route       where it happens — a path, or (ctx) => path
//   target      what it points at — a `[data-tour]` selector, a list tried in order (the
//               first that is on screen wins, e.g. a wide layout's rail, then the phone's
//               bar), or (ctx) => either. Absent on nothing: every step points at something.
//   prepare     the demo-store setup helpers it needs (tourSetup.js), run on arrival
//   features    the USER_MANUAL feature-index entries it explains (the coverage test)
//   action      a step the visitor can act on: `hint` says what to press, `until(ctx)` says
//               it happened, `doIt(robot, ctx)` does it for them, visibly ("Do it for me",
//               tourRobot.js), and `done` is what the card says once the result is on
//               screen — `title`, `body` (text or (ctx) => text, starting "Done.") and the
//               `target` the highlight moves to. The step then waits for Next: an action
//               never moves the tour on (owner feedback on PR #28, 2026-10-18)
//   side        the side of its target the tooltip tries first (it falls back to any other)
//   keepLayers  its target is inside a dialog the previous step opened, so don't close it
//
// ctx is tourContext(store) plus `path` (where the router is) and `since` (when the step
// opened). Copy follows the product's vocabulary, in sentence case, with no exclamation
// marks; people are named, never given a pronoun.

export const AUDIENCES = {
  everyone: "Everyone",
  managers: "Managers and admins",
  admins: "Admins only",
};

export const PERSONAS = {
  admin: "Admin",
  member: "Team member",
  manager: "Manager",
};

export const CHAPTERS = [
  {
    id: "admin",
    title: "Setting up the team",
    as: "admin",
    who: "Sanduni B., the owner",
  },
  { id: "member", title: "A member’s week", as: "member", who: "Imali J." },
  {
    id: "manager",
    title: "Reviewing and running the team",
    as: "manager",
    who: "Nadia F.",
  },
  {
    id: "fix",
    title: "Fixing a sent-back report",
    as: "member",
    who: "Imali J.",
  },
  { id: "approve", title: "Approving it", as: "manager", who: "Nadia F." },
  { id: "wrap", title: "For everyone", as: "manager", who: "Nadia F." },
];

const WHO = '[data-tour="demo-who"]';
const story = (ctx) => `/reports/${ctx.lastWeek}`;
const storyEdit = (ctx) => `/reports/${ctx.lastWeek}/edit`;
const review = (ctx) => `/review/${ctx.storyId}`;
const userMenu = (id) => `[data-tour="user-menu"][data-tour-id="${id}"]`;
const card = (id) => `[data-tour="team-update"][data-tour-id="${id}"]`;
const dayCard = (weekday) =>
  `[data-tour="day-card"][data-tour-id="${weekday}"]`;

const DIALOG = '[role="dialog"][data-state="open"]';

// The weekly form's task statuses, chosen for the visitor where they are still empty —
// one after another, a little faster when there are many.
async function fillForm(r) {
  const empty = [
    ...document.querySelectorAll("select[data-task-status]"),
  ].filter((select) => select.value === "");
  if (empty.length === 0) return;
  await r.area('[data-tour="form-tasks"]');
  const pause = Math.min(300, 1200 / empty.length);
  for (const select of empty) await r.choose(select, "in_progress", { pause });
}

export const STEPS = [
  // ------------------------------------------------------------ 1 · admin
  {
    id: "admin-start",
    chapter: "admin",
    audience: "admins",
    as: "admin",
    intro: true,
    title: "Sanduni sets up the team",
    body: "Admins can do everything managers and members can. This part shows what only admins do, as Sanduni, the team’s owner.",
    route: "/users",
    target: WHO,
    features: [],
  },
  {
    id: "users",
    chapter: "admin",
    audience: "admins",
    as: "admin",
    title: "Users",
    body: "Everyone on the team, with their role and status: Active, Invited or Removed. Members and managers don’t see this page.",
    route: "/users",
    target: '[data-tour="users-table"]',
    features: ["Users (manage)"],
  },
  {
    id: "invite",
    chapter: "admin",
    audience: "admins",
    as: "admin",
    title: "Invite a person",
    body: "Enter an email and a role, then create the link. WeeklyView sends no email: you send the link yourself.",
    route: "/users",
    target: '[data-tour="invite-person"]',
    features: ["Invite a person"],
    action: {
      hint: "Press Invite person to try it.",
      until: () => Boolean(document.querySelector('[data-tour="link-block"]')),
      async doIt(r, ctx) {
        if (!document.getElementById("invite-form")) {
          await r.click('[data-tour="invite-person"]');
        }
        await r.area(DIALOG);
        await r.fill(
          '#invite-form input[type="email"]',
          freeInviteEmail(ctx.store),
        );
        await r.click('[data-tour="invite-create"]');
      },
      done: {
        title: "The link is shown once",
        body: "Done. The invite link is ready, and this is the only time it’s shown. It works once and expires after 7 days; in the real product you’d copy it and send it to the person.",
        target: '[data-tour="link-block"]',
      },
    },
  },
  {
    id: "change-role",
    chapter: "admin",
    audience: "admins",
    as: "admin",
    title: "Change a role",
    body: "Pick a role and it saves at once. Only the owner can make someone an admin.",
    route: "/users",
    target: (ctx) =>
      `[data-tour="role-select"][data-tour-id="${ctx.ids.ruwan}"]`,
    features: ["Roles"],
  },
  {
    id: "edit-email",
    side: "top",
    chapter: "admin",
    audience: "admins",
    as: "admin",
    title: "Change an email",
    body: "Each person’s ⋯ menu has Edit email, for the address they sign in with. It must be unused, and they’re signed out everywhere.",
    route: "/users",
    target: (ctx) => userMenu(ctx.ids.ruwan),
    features: ["Edit email (admin)"],
  },
  {
    id: "reset-link",
    side: "top",
    chapter: "admin",
    audience: "admins",
    as: "admin",
    title: "Issue a password-reset link",
    body: "There’s no email, so a forgotten password is reset with a link from an admin. Choose Password reset link in the ⋯ menu.",
    route: "/users",
    target: (ctx) => userMenu(ctx.ids.ruwan),
    features: ["Password reset link (admin)"],
    action: {
      hint: "Open Ruwan’s ⋯ menu to try it.",
      until: () => Boolean(document.querySelector('[data-tour="link-block"]')),
      async doIt(r, ctx) {
        await r.press(userMenu(ctx.ids.ruwan));
        await r.area('[role="menu"][data-state="open"]');
        await r.click('[data-tour="menu-reset"]');
        await r.area(DIALOG);
        await r.click('[data-tour="issue-link"]');
      },
      done: {
        title: "A one-time reset link",
        body: "Done. Ruwan’s reset link is ready, and this is the only time it’s shown. It works once and expires after 24 hours; setting a new password with it signs Ruwan out of every other device.",
        target: '[data-tour="link-block"]',
      },
    },
  },
  {
    id: "remove",
    side: "top",
    chapter: "admin",
    audience: "admins",
    as: "admin",
    title: "Remove someone, and bring them back",
    body: "Remove, in the ⋯ menu, deactivates an account; their weeks stay readable and theirs. Inviting the same email again brings the account back.",
    route: "/users",
    target: (ctx) => userMenu(ctx.ids.ruwan),
    features: ["Remove a person / re-invite"],
  },
  {
    id: "owner",
    chapter: "admin",
    audience: "admins",
    as: "admin",
    title: "The owner is protected",
    body: "Sanduni created the team, so Sanduni is the owner. No other admin can demote or remove the owner, or change the owner’s email.",
    route: "/users",
    target: (ctx) =>
      `[data-tour="role-select"][data-tour-id="${ctx.ids.sanduni}"]`,
    features: [],
  },
  {
    id: "make-owner",
    side: "top",
    chapter: "admin",
    audience: "admins",
    as: "admin",
    title: "Pass ownership on",
    body: "Only the owner can do this, with Make owner in a manager’s or admin’s ⋯ menu. Sanduni would stay an admin and lose only the protection.",
    route: "/users",
    target: (ctx) => userMenu(ctx.ids.nadia),
    features: ["Make owner"],
  },
  {
    id: "holidays",
    chapter: "admin",
    audience: "admins",
    as: "admin",
    title: "Holidays",
    body: "A holiday applies to everyone: no daily update is expected, and project plans skip the day. Add holiday sets one.",
    route: "/holidays",
    target: '[data-tour="add-holiday"]',
    features: ["Holidays (manage)"],
  },

  // ------------------------------------------------------------ 2 · member
  {
    id: "member-start",
    chapter: "member",
    audience: "everyone",
    as: "member",
    intro: true,
    title: "Imali’s week",
    body: "Everyone posts daily updates, managers and admins included. You’re now Imali, a team member.",
    route: "/",
    target: WHO,
    prepare: ["storyDraft"],
    features: [],
  },
  {
    id: "this-week",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "This week",
    body: "Imali’s home page: the week, the day being written, and how the week is going. The button at the top always offers the next thing to do.",
    route: "/",
    target: ['[data-tour="topbar-primary"]', '[data-tour="week-strip"]'],
    features: ["This week"],
  },
  {
    id: "week-strip",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "The week strip",
    body: "Monday to Friday, each with its state: posted, missing, today, later, a holiday or leave. Choose a day to open it.",
    route: "/",
    target: '[data-tour="week-strip"]',
    features: ["Week strip (Mon–Fri)"],
  },
  {
    id: "week-picker",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "Other weeks",
    body: "Move to any week since you joined. Weeks you’ve filed show their status here.",
    route: "/",
    target: '[data-tour="topbar-week-picker"]',
    features: ["Week picker"],
  },
  {
    id: "work-line",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "A work line",
    body: "Each line is a task, its type, what was done and the hours. The task belongs to a project, so the hours count toward it.",
    route: (ctx) => `/?day=${ctx.openDay}`,
    target: '[data-tour="work-line"]',
    prepare: ["imaliCanPost"],
    features: ["Hours", "Task types (7 colours)"],
  },
  {
    id: "blockers",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "Blockers",
    body: "Optional. If something is holding work up, say so here. Blockers are gathered into the weekly report, and managers see the open ones.",
    route: (ctx) => `/?day=${ctx.openDay}`,
    target: '[data-tour="add-blocker"]',
    prepare: ["imaliCanPost"],
    features: ["Blockers (write)"],
  },
  {
    id: "open-to-team",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "Open to team comments",
    body: "Teammates can comment on a day only when it’s open to the team. Managers can always comment.",
    route: (ctx) => `/?day=${ctx.openDay}`,
    target: '[data-tour="team-comments-checkbox"]',
    prepare: ["imaliCanPost"],
    features: ["Open to team comments"],
  },
  {
    id: "save-draft",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "Save without posting",
    body: "Save keeps what you wrote without sharing it, until you sign out. Unposted text also stays when you switch days.",
    route: (ctx) => `/?day=${ctx.openDay}`,
    target: '[data-tour="day-save"]',
    prepare: ["imaliCanPost"],
    features: ["Drafts (unposted text kept until sign-out)"],
  },
  {
    id: "post",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "Post the update",
    body: "Posting shares the day with the whole team. The first update of a week starts its report as a Draft.",
    route: (ctx) => `/?day=${ctx.openDay}`,
    target: '[data-tour="day-panel"]',
    prepare: ["imaliCanPost"],
    features: ["Post a daily update"],
    action: {
      hint: "Fill in the line and press Post update.",
      until: (ctx) => Boolean(ctx.memo.day) && imaliPosted(ctx, ctx.memo.day),
      remember: (ctx) => ({ day: ctx.openDay }),
      async doIt(r) {
        await r.pickFirst('[data-tour="work-line"] [role="combobox"]');
        await r.choose('[data-tour="work-line"] select', "development");
        await r.fill(
          '[data-tour="work-line"] input[placeholder="What I did"]',
          TOUR_TEXT.line,
        );
        await r.fill('[data-tour="work-line"] input[type="number"]', "4");
        await r.click('[data-tour="day-post"]');
      },
      done: {
        title: "Posted",
        body: (ctx) =>
          `Done. Imali’s ${WEEKDAY_LABELS[ctx.memo.day]} update is posted, and its square on the strip is now filled.`,
        target: (ctx) =>
          `[data-tour="strip-day"][data-tour-id="${ctx.memo.day}"]`,
      },
    },
  },
  {
    id: "edit-day",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "Edit a posted day",
    body: "Any day of an open week can be edited; Cancel leaves it as it was. Once the report is submitted, its days are frozen.",
    route: (ctx) => `/?day=${ctx.postedDay}`,
    target: ['[data-tour="day-edit"]', '[data-tour="day-panel"]'],
    prepare: ["imaliHasPosted"],
    features: [],
  },
  {
    id: "leave-line",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "Who’s away",
    body: "Everyone can see who is on leave this week, and which days are holidays.",
    route: "/",
    target: '[data-tour="on-leave-strip"]',
    features: [],
  },
  {
    id: "own-leave",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "Your own leave",
    body: "Turn this on when you’re away: leave starts now, and days away need no update. Turning it off asks first.",
    route: "/account",
    target: '[data-tour="account-leave"]',
    features: ["Leave (turn on/off)", "Confirm before ending leave"],
  },
  {
    id: "team-updates",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "Team updates",
    body: "Everyone’s daily updates for one day. Pick a day, filter by project, or show only days with an open blocker.",
    route: (ctx) => `/updates?day=${ctx.teamDay}`,
    target: '[data-tour="day-tabs"]',
    prepare: ["teamDayOpen"],
    features: ["Team updates"],
  },
  {
    id: "team-comment",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "Comment on a teammate’s day",
    body: "Ayesha opened this day to the team, so Imali can comment. Where a day isn’t open, only its author and managers can.",
    route: (ctx) => `/updates?day=${ctx.teamDay}`,
    target: (ctx) => [
      `${card(ctx.ids.ayesha)} [data-tour="comment-start"]`,
      `${card(ctx.ids.ayesha)} [data-tour="day-comments"]`,
    ],
    prepare: ["teamDayOpen"],
    features: ["Comments on a day"],
    action: {
      hint: "Press Comment, write a line and post it.",
      until: (ctx) =>
        commentsSince(
          ctx,
          ctx.ids.ayesha,
          ctx.thisWeek,
          ctx.teamDay,
          ctx.ids.imali,
          ctx.since,
        ) > 0,
      async doIt(r, ctx) {
        const root = await r.waitFor(card(ctx.ids.ayesha));
        await r.area(`${card(ctx.ids.ayesha)} [data-tour="day-comments"]`);
        if (!root.querySelector("textarea")) {
          await r.click('[data-tour="comment-start"]', { root });
        }
        await r.fill("textarea", TOUR_TEXT.teamComment, { root });
        await r.click('form button[type="submit"]', { root });
      },
      done: {
        title: "Comment posted",
        body: "Done. Imali’s comment is under Ayesha’s update, where Ayesha and the team can read it.",
        target: (ctx) => `${card(ctx.ids.ayesha)} [data-tour="day-comments"]`,
      },
    },
  },
  {
    id: "edit-comment",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "Edit or delete, for 10 minutes",
    body: "Your own comment or reply can be changed or deleted for 10 minutes after posting. The counter shows the minutes left.",
    route: (ctx) => `/updates?day=${ctx.teamDay}`,
    target: (ctx) => [
      `${card(ctx.ids.ayesha)} [data-tour="comment-edit"]`,
      `${card(ctx.ids.ayesha)} [data-tour="day-comments"]`,
    ],
    prepare: ["imaliTeamComment"],
    features: ["Edit / delete a comment (10 minutes)"],
  },
  {
    id: "reply",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "Reply to a comment",
    body: "Nadia asked a question on one of Imali’s days. Every comment can have replies, so the conversation stays in one place.",
    route: story,
    target: (ctx) => [
      `${dayCard(ctx.replyDay)} [data-tour="reply"]`,
      `${dayCard(ctx.replyDay)} [data-tour="day-comments"]`,
    ],
    prepare: ["storyDraft"],
    features: [],
    action: {
      hint: "Press Reply and answer Nadia.",
      until: (ctx) =>
        commentsSince(
          ctx,
          ctx.ids.imali,
          ctx.lastWeek,
          ctx.replyDay,
          ctx.ids.imali,
          ctx.since,
        ) > 0,
      async doIt(r, ctx) {
        const root = await r.waitFor(dayCard(ctx.replyDay));
        await r.area(`${dayCard(ctx.replyDay)} [data-tour="day-comments"]`);
        if (!root.querySelector("textarea")) {
          await r.click('[data-tour="reply"]', { root });
        }
        await r.fill("textarea", TOUR_TEXT.reply, { root });
        await r.click('form button[type="submit"]', { root });
      },
      done: {
        title: "Reply posted",
        body: "Done. Imali’s reply sits under Nadia’s question, so the conversation stays in one place.",
        target: (ctx) => `${dayCard(ctx.replyDay)} [data-tour="day-comments"]`,
      },
    },
  },
  {
    id: "privacy",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "What teammates see",
    body: "On Ruwan’s week, Imali sees the daily updates only. A weekly report is shared with its author and managers, never with teammates.",
    route: (ctx) => `/people/${ctx.ids.ruwan}/reports/${ctx.lastWeek}`,
    target: '[data-tour="teammate-note"]',
    features: ["Privacy rules", '"Both sides" (team member vs manager)'],
  },
  {
    id: "report-form",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "The weekly report builds itself",
    body: "Every day of Imali’s last week is posted, so its report is ready. Tasks and hours come from the days; give each task a status, such as Done or Carried over.",
    route: storyEdit,
    target: '[data-tour="form-tasks"]',
    prepare: ["storyDraft"],
    features: ["Weekly report form", "Carried-over tasks"],
  },
  {
    id: "achievements",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "Achievements and notes",
    body: "Add what went well and flag one as key. Plans for next week, blockers, notes and links have their own sections.",
    route: storyEdit,
    target: '[data-tour="form-achievements"]',
    prepare: ["storyDraft"],
    features: [],
  },
  {
    id: "hours-by-type",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "Hours by task type",
    body: "Worked out from the days’ lines, in the seven type colours. There’s nothing to fill in, and it always matches.",
    route: storyEdit,
    target: '[data-tour="form-hours"]',
    prepare: ["storyDraft"],
    features: ["Hours by task type"],
  },
  {
    id: "autosave",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "Autosave",
    body: "The form saves itself as you type, and says when it last did. A refresh never overwrites what you’re typing.",
    route: storyEdit,
    target: '[data-tour="autosave"]',
    prepare: ["storyDraft"],
    features: ["Autosave (weekly form)"],
  },
  {
    id: "checklist",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "Before you submit",
    body: "A report can be submitted once every expected day has an update and every task has a status. This shows what’s left.",
    route: storyEdit,
    target: ['[data-tour="submit-checklist"]', '[data-tour="submit"]'],
    prepare: ["storyDraft"],
    features: ['Submit checklist ("Before you submit")'],
  },
  {
    id: "ask-approval",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "Ask for approval",
    body: "Tick it when the week needs a manager’s sign-off. Without it, Submitted can be the report’s final state.",
    route: storyEdit,
    target: '[data-tour="ask-approval"]',
    prepare: ["storyDraft"],
    features: ["Ask for approval"],
  },
  {
    id: "submit",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "Submit",
    body: "Submitting hands the week in: Imali’s report goes to the review desk, and its days are frozen.",
    route: storyEdit,
    target: '[data-tour="sticky-bar"]',
    prepare: ["storyDraft"],
    features: ["Submit / Resubmit"],
    action: {
      hint: "Set every task’s status, tick Ask for approval, then press Submit.",
      until: (ctx) => storyIs(ctx, "submitted"),
      async doIt(r) {
        await fillForm(r);
        await r.area('[data-tour="sticky-bar"]');
        await r.tick('[data-tour="ask-approval"] input');
        await r.click('[data-tour="submit"]');
      },
      done: {
        title: "Handed in",
        body: "Done. Imali’s report is submitted: its status now reads Submitted, and it’s waiting on Nadia’s review desk.",
        target: '[data-tour="week-status"]',
      },
    },
  },
  {
    id: "filed-week",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "Submitted",
    body: "Submitted, with Approval asked, means a manager decides next. Managers can now read the whole report; teammates still see only the days.",
    route: story,
    target: '[data-tour="week-status"]',
    prepare: ["storySubmitted"],
    features: ["Report statuses"],
  },
  {
    id: "day-cards",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "Day cards",
    body: "On a week page each day is a card: its lines, hours, blockers and comments. A missing day has a red bar.",
    route: story,
    // One card: the whole column is taller than the screen.
    target: '[data-tour="day-card"]',
    prepare: ["storySubmitted"],
    features: ["Day cards"],
  },
  {
    id: "resolve-blocker",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "Resolve a blocker",
    body: "When a blocker is sorted, tick it. This works at any status, even after approval, and doesn’t change the report.",
    route: story,
    target: '[data-tour="blocker-resolve"]',
    prepare: ["storySubmitted"],
    features: ["Blockers (resolve)"],
  },
  {
    id: "overall-comments",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "Overall comments",
    body: "Comments on the whole week live here. Imali and managers can write them; teammates never see them.",
    route: story,
    target: '[data-tour="week-comments"]',
    prepare: ["storySubmitted"],
    features: ["Comments on the week (overall comments)"],
  },
  {
    id: "print",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "Print a week",
    body: "Press Ctrl+P on a week page to print just the report, on a white page, with its status and version.",
    route: story,
    target: '[data-tour="week-heading"]',
    prepare: ["storySubmitted"],
    features: ["Print a report"],
  },
  {
    id: "my-reports",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "My reports",
    body: "Every week Imali was on the team, with its status: Draft, Submitted, Needs correction or Approved. Weeks with nothing due read Not started, On leave or Holiday week.",
    route: "/reports",
    target: '[data-tour="report-history"]',
    prepare: ["storySubmitted"],
    features: [
      "My reports (history)",
      "Report statuses",
      "Not started",
      "On leave (week state)",
      "Holiday week",
    ],
  },
  {
    id: "my-projects",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "My projects",
    body: "The projects Imali works on, with how far their plan has got, in days or hours.",
    route: "/",
    target: '[data-tour="my-projects"]',
    features: ["My projects"],
  },
  {
    id: "your-numbers",
    chapter: "member",
    audience: "everyone",
    as: "member",
    title: "Your numbers",
    body: "Three figures about Imali’s recent weeks: weeks filed, hours this month and open blockers.",
    route: "/",
    target: '[data-tour="your-numbers"]',
    features: ["Your numbers"],
  },

  // ------------------------------------------------------------ 3 · manager
  {
    id: "manager-start",
    chapter: "manager",
    audience: "managers",
    as: "manager",
    intro: true,
    title: "Nadia runs the team",
    body: "Managers can do everything members can. Admins can do everything here too.",
    route: "/",
    target: WHO,
    prepare: ["storySubmitted"],
    features: [],
  },
  {
    id: "manager-comment",
    chapter: "manager",
    audience: "managers",
    as: "manager",
    title: "Comment on anyone’s update",
    body: "Managers can comment on any daily update, their own included, whether or not it’s open to the team.",
    route: (ctx) => `/updates?day=${ctx.managerDay}`,
    target: (ctx) => [
      `${card(ctx.ids.ruwan)} [data-tour="comment-start"]`,
      `${card(ctx.ids.ruwan)} [data-tour="day-comments"]`,
    ],
    features: [],
    action: {
      hint: "Press Comment to try it.",
      until: (ctx) =>
        commentsSince(
          ctx,
          ctx.ids.ruwan,
          ctx.thisWeek,
          ctx.managerDay,
          ctx.ids.nadia,
          ctx.since,
        ) > 0,
      async doIt(r, ctx) {
        const root = await r.waitFor(card(ctx.ids.ruwan));
        await r.area(`${card(ctx.ids.ruwan)} [data-tour="day-comments"]`);
        if (!root.querySelector("textarea")) {
          await r.click('[data-tour="comment-start"]', { root });
        }
        await r.fill("textarea", TOUR_TEXT.managerComment, { root });
        await r.click('form button[type="submit"]', { root });
      },
      done: {
        title: "Comment posted",
        body: "Done. Nadia’s comment is under Ruwan’s update, and Ruwan can reply to it there.",
        target: (ctx) => `${card(ctx.ids.ruwan)} [data-tour="day-comments"]`,
      },
    },
  },
  {
    id: "open-day",
    chapter: "manager",
    audience: "managers",
    as: "manager",
    title: "Open a teammate’s day",
    body: "A manager can open anyone’s day to team comments, so teammates can join in.",
    route: (ctx) => `/updates?day=${ctx.managerDay}`,
    target: (ctx) => `${card(ctx.ids.ruwan)} [data-tour="team-switch"]`,
    features: [],
  },
  {
    id: "review-desk",
    chapter: "manager",
    audience: "managers",
    as: "manager",
    title: "The review desk",
    body: "Reports that asked for approval, oldest first. Nobody reviews their own report: Nadia’s own week goes to another manager or an admin.",
    route: (ctx) => (ctx.storyAsked ? "/review" : "/review?approval=all"),
    target: '[data-tour="review-desk"]',
    prepare: ["storySubmitted"],
    features: ["Review desk"],
  },
  {
    id: "open-review",
    chapter: "manager",
    audience: "managers",
    as: "manager",
    title: "Open Imali’s report",
    body: "Choose a request to read the report and decide.",
    route: (ctx) => (ctx.storyAsked ? "/review" : "/review?approval=all"),
    target: (ctx) =>
      `[data-tour="review-desk"] a[href$="/review/${ctx.storyId}"]`,
    prepare: ["storySubmitted"],
    features: [],
    action: {
      hint: "Choose Imali’s row.",
      until: (ctx) => ctx.path === `/review/${ctx.storyId}`,
      async doIt(r, ctx) {
        await r.click(
          `[data-tour="review-desk"] a[href$="/review/${ctx.storyId}"]`,
        );
      },
      done: {
        title: "Imali’s report is open",
        body: "Done. The whole week is here to read, with the review panel to decide on it.",
        target: '[data-tour="review-heading"]',
      },
    },
  },
  {
    id: "read-report",
    chapter: "manager",
    audience: "managers",
    as: "manager",
    title: "Reading a submitted report",
    body: "The whole week: the days, then the end-of-week sections. Managers comment, but never edit someone’s report.",
    route: review,
    target: '[data-tour="report-document"]',
    prepare: ["storySubmitted"],
    features: [],
  },
  {
    id: "comment-only",
    chapter: "manager",
    audience: "managers",
    as: "manager",
    title: "Comment on the week",
    body: "Write an overall comment and choose Comment only to say something without deciding. Managers can comment on anyone’s submitted week.",
    route: review,
    target: '[data-tour="review-panel"]',
    prepare: ["storySubmitted"],
    features: [],
  },
  {
    id: "send-back",
    chapter: "manager",
    audience: "managers",
    as: "manager",
    title: "Send it back",
    body: "A report goes back with a reason of at least 10 characters, and reads Needs correction until it’s resubmitted.",
    route: review,
    target: '[data-tour="review-panel"]',
    prepare: ["storySubmitted"],
    features: ["Send back"],
    action: {
      hint: "Write the reason, press Send back and confirm.",
      until: (ctx) => storyIs(ctx, "needs_correction"),
      async doIt(r) {
        const text = await r.waitFor('[data-tour="review-comment"]');
        if (text.value.trim().length < 10) {
          text.value = "";
          await r.fill(text, TOUR_TEXT.sendBack);
        }
        await r.click('[data-tour="send-back"]');
        await r.area(DIALOG);
        await r.click('[data-tour="confirm-action"]');
      },
      done: {
        title: "Sent back",
        body: "Done. Imali’s report is sent back. The panel says so, and the report reads Needs correction until Imali resubmits.",
        target: '[data-tour="review-panel"]',
      },
    },
  },
  {
    id: "next-in-desk",
    chapter: "manager",
    audience: "managers",
    as: "manager",
    title: "Next in review desk",
    body: "After a decision, this goes straight to the next request, keeping the desk’s filters.",
    route: review,
    target: ['[data-tour="next-in-desk"]', '[data-tour="review-panel"]'],
    prepare: ["storySentBack"],
    features: ["Next in review desk"],
  },
  {
    id: "dashboard",
    chapter: "manager",
    audience: "managers",
    as: "manager",
    title: "The team dashboard",
    body: "The week in four numbers: reports filed, compliance, needs correction and open blockers. Compliance leaves out weeks on leave and holiday weeks.",
    route: "/team",
    target: '[data-tour="metric-strip"]',
    features: ["Team dashboard", "Compliance"],
  },
  {
    id: "team-table",
    chapter: "manager",
    audience: "managers",
    as: "manager",
    title: "The Updates squares",
    body: "One row per person, with a square for each weekday. Every state has its own shape, so it reads without colour; the legend is underneath.",
    route: "/team",
    target: '[data-tour="team-table"]',
    features: ["Updates squares and legend"],
  },
  {
    id: "dashboard-projects",
    chapter: "manager",
    audience: "managers",
    as: "manager",
    title: "Projects at a glance",
    body: "Each project’s plan, shown in Days or Hours with the switch. An overdue plan is red, with Extend plan beside it.",
    route: "/team",
    target: '[data-tour="dashboard-projects"]',
    features: [],
  },
  {
    id: "charts",
    chapter: "manager",
    audience: "managers",
    as: "manager",
    title: "Charts",
    body: "Tasks completed over 4, 8 or 12 weeks, the week’s hours by task type, and the workload on each project.",
    route: "/team",
    target: '[data-tour="dashboard-charts"]',
    features: ["Charts (tasks completed, hours by type, workload)"],
  },
  {
    id: "activity",
    chapter: "manager",
    audience: "managers",
    as: "manager",
    title: "Recent activity",
    body: "The latest submissions, approvals and send-backs, whichever week they were for.",
    route: "/team",
    target: '[data-tour="activity-feed"]',
    features: ["Activity list (recent activity)"],
  },
  {
    id: "people",
    chapter: "manager",
    audience: "managers",
    as: "manager",
    title: "People",
    body: "Everyone with their role, status, reports filed and this week. A search finds people in every status.",
    route: "/people",
    target: '[data-tour="people-table"]',
    features: ["People list and profiles"],
  },
  {
    id: "profile",
    chapter: "manager",
    audience: "managers",
    as: "manager",
    title: "A person’s profile",
    body: "Malith’s week at a glance, four figures about recent weeks, and every week Malith was on the team.",
    route: (ctx) => `/people/${ctx.ids.malith}`,
    target: '[data-tour="profile-this-week"]',
    features: [],
  },
  {
    id: "leave-history",
    chapter: "manager",
    audience: "managers",
    as: "manager",
    title: "Leave history",
    body: "Every leave period, newest first: when it started, when it ended and who set it.",
    route: (ctx) => `/people/${ctx.ids.malith}`,
    target: '[data-tour="leave-history"]',
    features: ["Leave history"],
  },
  {
    id: "set-leave",
    chapter: "manager",
    audience: "managers",
    as: "manager",
    title: "Set anyone’s leave",
    body: "Managers and admins can turn anyone’s leave on or off, for someone who is away and can’t. Ending leave asks first.",
    route: (ctx) => `/people/${ctx.ids.malith}`,
    target: ['[data-tour="profile-leave"]', '[data-tour="topbar-more"]'],
    features: [],
  },
  {
    id: "projects",
    chapter: "manager",
    audience: "managers",
    as: "manager",
    title: "Projects",
    body: "Every project with its plan, progress and people. Members see the progress of their own projects on This week.",
    route: "/projects",
    target: '[data-tour="projects-table"]',
    features: ["Projects"],
  },
  {
    id: "new-project",
    chapter: "manager",
    audience: "managers",
    as: "manager",
    title: "Create a project",
    body: "Give it a name and its people, and a plan if you like: a start date, working days and planned hours for everyone together.",
    route: "/projects",
    target: '[data-tour="new-project"]',
    features: ["Planned hours / working days"],
  },
  {
    id: "extend-plan",
    chapter: "manager",
    audience: "managers",
    as: "manager",
    title: "Extend a plan",
    body: "R&D’s plan has run out, so it reads overdue in red. Extend plan adds working days and keeps the old plan under Earlier plans.",
    route: "/projects",
    // The row's buttons are a wide screen's; a phone shows the list.
    target: (ctx) => [
      `[data-tour="extend-plan"][data-tour-id="${ctx.projects.rnd}"]`,
      '[data-tour="projects-table"]',
    ],
    features: ["Extend plan"],
  },

  // ------------------------------------------------------------ 4 · fixing
  {
    id: "fix-start",
    chapter: "fix",
    audience: "everyone",
    as: "member",
    intro: true,
    title: "Back to Imali",
    body: "Nadia sent the report back. A “new” marker shows Imali where something changed since Imali last looked.",
    route: "/",
    target: ['[data-tour="nav:/reports"]', '[data-tour="recent-weeks"]'],
    prepare: ["storySentBack"],
    features: ['"New" markers'],
  },
  {
    id: "correction-panel",
    chapter: "fix",
    audience: "everyone",
    as: "member",
    title: "Needs correction",
    body: "The panel says who sent the week back and why. Reply answers Nadia; Open and fix opens the report again.",
    route: (ctx) => `/?week=${ctx.lastWeek}`,
    target: '[data-tour="correction-panel"]',
    prepare: ["storySentBack"],
    features: [],
  },
  {
    id: "resubmit",
    chapter: "fix",
    audience: "everyone",
    as: "member",
    title: "Fix and resubmit",
    body: "The report and its days can be edited again. Resubmitting makes a new version, and the old one is kept.",
    route: storyEdit,
    target: '[data-tour="sticky-bar"]',
    prepare: ["storySentBack"],
    features: ["Submit / Resubmit"],
    action: {
      hint: "Make the change, tick Ask for approval, then press Resubmit.",
      until: (ctx) => storyIs(ctx, "submitted", 2),
      async doIt(r) {
        await fillForm(r);
        await r.area('[data-tour="form-notes"]');
        await r.fill(
          '[data-tour="form-notes"] textarea',
          TOUR_TEXT.resubmitNote,
        );
        await r.area('[data-tour="sticky-bar"]');
        await r.tick('[data-tour="ask-approval"] input');
        await r.click('[data-tour="submit"]');
      },
      done: {
        title: "Resubmitted",
        body: "Done. Imali’s report reads Submitted again, as a new version, and it’s back on Nadia’s review desk.",
        target: '[data-tour="week-status"]',
      },
    },
  },
  {
    id: "versions",
    chapter: "fix",
    audience: "everyone",
    as: "member",
    title: "Versions",
    body: "Each submission is kept: rev 1 was sent back, rev 2 is waiting. Choose one to read it as it was.",
    route: story,
    target: '[data-tour="week-versions"]',
    prepare: ["storyResubmitted"],
    features: ["Versions (revisions)"],
  },

  // ------------------------------------------------------------ 5 · approving
  {
    id: "approve",
    chapter: "approve",
    audience: "managers",
    as: "manager",
    title: "Approve",
    body: "Back as Nadia, reading the corrected week. A comment is optional when approving.",
    route: review,
    target: '[data-tour="review-panel"]',
    prepare: ["storyResubmitted"],
    features: ["Approve a report"],
    action: {
      hint: "Press Approve.",
      until: (ctx) => storyIs(ctx, "approved"),
      async doIt(r) {
        await r.click('[data-tour="approve"]');
      },
      done: {
        title: "Approved",
        body: "Done. Imali’s report is approved: its status now reads Approved.",
        target: '[data-tour="review-status"]',
      },
    },
  },
  {
    id: "approved",
    chapter: "approve",
    audience: "managers",
    as: "manager",
    title: "Approved, everywhere",
    body: "The status changes everywhere at once: on the dashboard, the review desk, and Imali’s This week and My reports.",
    route: (ctx) => `/team?week=${ctx.lastWeek}`,
    target: (ctx) => `[data-tour="team-table"] a[href*="${ctx.ids.imali}"]`,
    prepare: ["storyApproved"],
    features: [],
  },

  // ------------------------------------------------------------ 6 · wrap-up
  {
    id: "account",
    chapter: "wrap",
    audience: "everyone",
    as: "manager",
    title: "Your account",
    body: "Everyone can change their name and password here. An email is changed by an admin.",
    route: "/account",
    target: '[data-tour="account-profile"]',
    features: [
      "Account page (name, password, theme, leave)",
      "Password change",
    ],
  },
  {
    id: "appearance",
    chapter: "wrap",
    audience: "everyone",
    as: "manager",
    title: "Light or dark",
    body: "Choose Light or Dark for this device. Everything, this tour included, is designed for both.",
    route: "/account",
    target: '[data-tour="account-appearance"]',
    features: ["Dark theme"],
  },
  {
    id: "finish",
    chapter: "wrap",
    audience: "everyone",
    as: "manager",
    finish: true,
    title: "Where to go next",
    body: "Switch shows the demo as someone else, and Start over brings back the sample data. The Tour button opens any part again.",
    route: "/account",
    target: '[data-tour="demo-bar"]',
    features: ["Demo (three perspectives)", "Guided tour (demo)"],
  },
];

/** Features of the manual's index the tour doesn't show, and why. */
export const NOT_IN_TOUR = {
  "Landing page":
    "It is outside the demo: the page the visitor came from, with its own look.",
  "Sign up (first account only)":
    "Accounts aren’t part of the demo; the last step links to the real site.",
  "Session expiry sign-in window": "The demo has no sessions to expire.",
  '"Starting up" screen':
    "It appears only while the real server wakes up; the demo has no server.",
  "Offline strip":
    "The demo never goes over the network, so it can’t lose the connection.",
  "Error toast with Retry":
    "The demo’s saves don’t fail, and the tour won’t fake a failure.",
  "Stale version banner":
    "It needs two people acting on one report at the same moment.",
};

/**
 * The role capabilities of requirments_doc.md §1, each with the steps that show it.
 * `text` is the start of the bullet (the coverage test matches it).
 */
export const CAPABILITIES = [
  {
    role: "member",
    text: "Post a daily update each working day",
    steps: ["work-line", "blockers", "post"],
  },
  {
    role: "member",
    text: "Read teammates' daily updates, and comment on one when it has been opened to the team",
    steps: ["team-updates", "team-comment"],
  },
  {
    role: "member",
    text: "Build and submit their weekly report, optionally asking for approval",
    steps: ["report-form", "ask-approval", "submit"],
  },
  {
    role: "member",
    text: "View their own report history and statuses",
    steps: ["my-reports"],
  },
  {
    role: "member",
    text: "Read and reply to comments on their updates and their week",
    steps: ["reply", "overall-comments", "correction-panel"],
  },
  {
    role: "member",
    text: "See project progress for the projects they work on",
    steps: ["my-projects"],
  },
  {
    role: "member",
    text: "See who is on leave and which days are holidays, and set their own leave",
    steps: ["leave-line", "own-leave"],
  },
  {
    role: "manager",
    text: "Comment on anyone's daily update, their own included, and on anyone's submitted week",
    steps: ["manager-comment", "comment-only"],
  },
  {
    role: "manager",
    text: "Read every team member's weekly report once submitted",
    steps: ["read-report"],
  },
  {
    role: "manager",
    text: "Approve or send back any submitted report except their own",
    steps: ["review-desk", "send-back", "approve"],
  },
  {
    role: "manager",
    text: "Open a teammate's daily updates to team comments",
    steps: ["open-day"],
  },
  {
    role: "manager",
    text: "View the team dashboard and each person's profile",
    steps: ["dashboard", "profile"],
  },
  {
    role: "manager",
    text: "Create projects, set and extend their plans, and assign people to them",
    steps: ["new-project", "extend-plan"],
  },
  { role: "manager", text: "Set anyone's leave", steps: ["set-leave"] },
  { role: "admin", text: "invite", steps: ["invite"] },
  { role: "admin", text: "remove", steps: ["remove"] },
  { role: "admin", text: "change roles", steps: ["change-role"] },
  { role: "admin", text: "change an email", steps: ["edit-email"] },
  {
    role: "admin",
    text: "issue a password-reset link",
    steps: ["reset-link"],
  },
  { role: "admin", text: "manage holidays", steps: ["holidays"] },
];

/** What a step's action doesn't need from the visitor's time, roughly, in seconds. */
const READ_SECONDS = 9;
const ACT_SECONDS = 30;

/** An honest length: reading every step, doing every action yourself. */
export function tourMinutes(steps = STEPS) {
  const seconds = steps.reduce(
    (sum, step) => sum + (step.action ? ACT_SECONDS : READ_SECONDS),
    0,
  );
  return Math.round(seconds / 60);
}
