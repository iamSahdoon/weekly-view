import { addDays, addHours, subMinutes, subWeeks } from "date-fns";
import { WEEKDAYS } from "../lib/constants.js";
import {
  addWeeks,
  currentWeekKey,
  toCalendarDate,
  weekDays,
} from "../lib/dates.js";

// Hard-coded demo data (tech_stack.md §6.9). Dates are relative to the moment the
// demo starts, so it never shows a stale week: the current week, last week and the
// week before always hold the states a reader can meet. C1 held the three
// perspectives; C3 adds projects, tasks and weeks; C10 completes the cast of brand §10.

export const PERSPECTIVES = Object.freeze({
  member: "000000000000000000000a01",
  manager: "000000000000000000000a02",
  admin: "000000000000000000000a03",
});

const [IMALI, NADIA, SANDUNI] = Object.values(PERSPECTIVES);

// The rest of the cast (brand §10), all members: they fill the team table and the
// review desk. Their ids follow the perspectives'.
const RUWAN = "000000000000000000000a04";
const THARINDU = "000000000000000000000a05";
const AYESHA = "000000000000000000000a06";
const DINESH = "000000000000000000000a07";
const MALITH = "000000000000000000000a08";

// Ids are 24 hex digits like the API's: two for the kind, the rest a counter.
const id = (kind, n) => `${kind}${String(n).padStart(22, "0")}`;
const PROJECT = {
  clientA: id("0b", 1),
  rnd: id("0b", 2),
  internal: id("0b", 3),
  marketing: id("0b", 4),
};
const TASK = {
  checkout: id("0c", 1),
  payments: id("0c", 2),
  auth: id("0c", 3),
  scheduler: id("0c", 4),
  research: id("0c", 5),
  planning: id("0c", 6),
  teamPlanning: id("0c", 7),
  migration: id("0c", 8),
  adminReports: id("0c", 9),
  mobile: id("0c", 10),
  launchCopy: id("0c", 11),
  newsletter: id("0c", 12),
  pipeline: id("0c", 13),
  benchmarks: id("0c", 14),
  roadmap: id("0c", 15),
  reviews: id("0c", 16),
  designReview: id("0c", 17),
};

let counter = 0;
const next = (kind) => id(kind, ++counter);

// A moment on a given day, e.g. at(friday, 1, 9) is the next morning at 09:00.
const at = (date, days, hour) => addHours(addDays(date, days), hour);

// One person's lines, blockers and thread for each day of a week.
//   lines     [taskId, taskType, text, hours]
//   blockers  [text, { isKey }]
function dayOf(weekday, date, { lines, blockers = [], comments = [], open }) {
  return {
    weekday,
    lines: lines.map(([taskId, taskType, text, hours]) => ({
      _id: next("e1"),
      taskId,
      taskType,
      text,
      hours,
    })),
    blockers: blockers.map(([text, isKey]) => ({
      _id: next("f1"),
      text,
      isKey: Boolean(isKey),
    })),
    openToTeam: Boolean(open),
    postedAt: at(date, 0, 17).toISOString(),
    editedAt: null,
    comments,
  };
}

const task = (_id, name, project, owner, doneAt = null) => ({
  _id,
  name,
  project,
  owner,
  doneAt: doneAt ? doneAt.toISOString() : null,
});

const thread = (author, text, createdAt, extra = {}) => ({
  _id: next("d1"),
  author,
  text,
  createdAt: createdAt.toISOString(),
  editedAt: null,
  replies: [],
  ...extra,
});

const reply = (author, text, createdAt) => ({
  _id: next("d1"),
  author,
  text,
  createdAt: createdAt.toISOString(),
  editedAt: null,
});

// A frozen copy of what was submitted: content and days, no comments (R9).
const snapshot = (report) => ({
  content: structuredClone(report.content),
  days: structuredClone(report.days).map((day) => ({ ...day, comments: [] })),
});

export function buildFixtures(now = new Date(), { team = true } = {}) {
  counter = 0;
  const joined = subWeeks(now, 26).toISOString();
  const thisWeek = currentWeekKey(now);
  const lastWeek = addWeeks(thisWeek, -1);
  const olderWeek = addWeeks(thisWeek, -2);
  // Days of the current week that are behind us (Monday on a Monday). On a Saturday or
  // Sunday the whole week is behind us, so Friday is posted like the rest; what stays
  // missing is deliberate (Ayesha's first day, Dinesh's whole week, Malith on leave).
  const weekend = now.getDay() === 0 || now.getDay() === 6;
  const todayIndex = Math.min(4, (now.getDay() + 6) % 7);
  const pastDays = weekend ? 5 : Math.max(1, todayIndex);

  const dates = (weekKey) => weekDays(weekKey).map((d) => d.date);

  // ---- Imali: last week, sent back
  const [mon1, tue1, wed1, thu1, fri1] = dates(lastWeek);
  // Friday evening, after the 17:00 submit: never in the future, even on a Monday morning.
  const sentBackAt = at(fri1, 0, 18);
  const imaliLast = {
    _id: id("b1", 1),
    author: IMALI,
    weekKey: lastWeek,
    status: "needs_correction",
    approvalRequested: true,
    revisionNumber: 1,
    submittedAt: at(fri1, 0, 17).toISOString(),
    lastActivityAt: sentBackAt.toISOString(),
    days: [
      dayOf("mon", mon1, {
        lines: [
          [TASK.checkout, "development", "Rebuilt the basket summary", 4],
          [TASK.payments, "meetings", "Payments kickoff with the client", 2],
        ],
        blockers: [["Waiting on API keys from the client", true]],
      }),
      dayOf("tue", tue1, {
        lines: [
          [
            TASK.payments,
            "development",
            "Wired payments on the test site",
            6.5,
          ],
        ],
        open: true,
        comments: [
          thread(
            NADIA,
            "Can you share the test card numbers in the channel?",
            at(tue1, 0, 18),
          ),
        ],
      }),
      dayOf("wed", wed1, {
        lines: [
          [TASK.checkout, "development", "Address form validation", 5],
          [
            TASK.research,
            "research_study",
            "Compared two card-vault options",
            2,
          ],
        ],
      }),
      dayOf("thu", thu1, {
        lines: [
          [TASK.payments, "testing", "Regression tests on the test site", 7],
        ],
      }),
      dayOf("fri", fri1, {
        lines: [
          [TASK.checkout, "review", "Reviewed Tharindu's pull request", 2],
          [TASK.payments, "documentation", "Wrote up the payment flow", 3],
        ],
      }),
    ],
    content: {
      tasks: [
        {
          taskId: TASK.checkout,
          status: "in_progress",
          note: "Basket and address done; shipping next",
        },
        {
          taskId: TASK.payments,
          status: "in_progress",
          note: "Test site works end to end",
        },
        { taskId: TASK.research, status: "done", note: "" },
      ],
      nextWeek: ["Shipping options", "Production keys, if they arrive"],
      achievements: [
        {
          _id: next("a1"),
          text: "Payments work on the test site",
          isKey: true,
        },
      ],
      notes: "",
      links: [
        { label: "Payment flow notes", url: "https://example.com/payments" },
      ],
    },
    weekComments: [],
    blockerResolutions: [],
    latestComment: null,
    revisions: [],
  };
  imaliLast.blockerResolutions.push({
    blockerId: imaliLast.days[0].blockers[0]._id,
    resolvedAt: at(thu1, 0, 15).toISOString(),
    resolvedBy: IMALI,
  });
  const imaliSnapshot = snapshot(imaliLast);
  const sendBack = thread(
    NADIA,
    "The hours by type look off — Thursday testing time is missing from the notes.",
    sentBackAt,
    { revisionNumber: 1, kind: "send_back" },
  );
  sendBack.replies.push(
    reply(
      IMALI,
      "Thanks — I'll fix the note and resubmit.",
      addHours(sentBackAt, 3),
    ),
  );
  imaliLast.weekComments.push(sendBack);
  imaliLast.latestComment = {
    text: sendBack.text,
    author: NADIA,
    revisionNumber: 1,
    createdAt: sentBackAt.toISOString(),
  };
  imaliLast.revisions.push({
    revisionNumber: 1,
    approvalRequested: true,
    submittedAt: imaliLast.submittedAt,
    submittedBy: IMALI,
    action: "changes_requested",
    comment: sendBack.text,
    reviewedBy: NADIA,
    reviewedAt: sentBackAt.toISOString(),
    ...imaliSnapshot,
  });
  // The author has started correcting: live content now differs from revision 1.
  imaliLast.content.tasks[1].note =
    "Test site works end to end; Thursday testing is in the notes";
  imaliLast.content.notes =
    "Testing on Thursday covered the card, wallet and refund paths.";

  // ---- Imali: the week before, approved on the second version
  const olderDates = dates(olderWeek);
  const approvedAt = at(olderDates[4], 4, 10);
  const imaliOlder = {
    _id: id("b1", 2),
    author: IMALI,
    weekKey: olderWeek,
    status: "approved",
    approvalRequested: true,
    revisionNumber: 2,
    submittedAt: at(olderDates[4], 3, 15).toISOString(),
    lastActivityAt: approvedAt.toISOString(),
    days: WEEKDAYS.map((weekday, i) =>
      dayOf(weekday, olderDates[i], {
        lines: [
          [TASK.auth, "development", "Login timeout fix", 4],
          [TASK.planning, "meetings", "Sprint planning and stand-ups", 2],
        ],
        blockers:
          i === 1 ? [["Waiting on API keys from the client", false]] : [],
      }),
    ),
    content: {
      tasks: [
        { taskId: TASK.auth, status: "done", note: "Shipped on Friday" },
        { taskId: TASK.planning, status: "done", note: "" },
      ],
      nextWeek: ["Checkout redesign"],
      achievements: [
        { _id: next("a1"), text: "Login timeout is gone", isKey: true },
      ],
      notes: "",
      links: [],
    },
    weekComments: [],
    blockerResolutions: [],
    latestComment: null,
    revisions: [],
  };
  const firstSnapshot = snapshot(imaliOlder);
  const firstSentBack = thread(
    SANDUNI,
    "Please add a note on what shipped before I approve.",
    at(olderDates[4], 3, 10),
    { revisionNumber: 1, kind: "send_back" },
  );
  imaliOlder.content.tasks[0].note = "Shipped on Friday after the retest";
  const approval = thread(SANDUNI, "Good week. Approved.", approvedAt, {
    revisionNumber: 2,
    kind: "approval",
  });
  imaliOlder.weekComments.push(firstSentBack, approval);
  imaliOlder.revisions.push(
    {
      revisionNumber: 2,
      approvalRequested: true,
      submittedAt: imaliOlder.submittedAt,
      submittedBy: IMALI,
      action: "approved",
      comment: approval.text,
      reviewedBy: SANDUNI,
      reviewedAt: approvedAt.toISOString(),
      ...snapshot(imaliOlder),
    },
    {
      revisionNumber: 1,
      approvalRequested: true,
      submittedAt: at(olderDates[4], 0, 17).toISOString(),
      submittedBy: IMALI,
      action: "changes_requested",
      comment: firstSentBack.text,
      reviewedBy: SANDUNI,
      reviewedAt: firstSentBack.createdAt,
      ...firstSnapshot,
    },
  );

  // ---- Imali: this week, a Draft
  const nowDates = dates(thisWeek);
  const imaliNow = {
    _id: id("b1", 3),
    author: IMALI,
    weekKey: thisWeek,
    status: "draft",
    approvalRequested: false,
    revisionNumber: 0,
    submittedAt: null,
    lastActivityAt: null,
    days: WEEKDAYS.slice(0, pastDays).map((weekday, i) =>
      dayOf(weekday, nowDates[i], {
        lines: [
          [TASK.checkout, "development", "Shipping options screen", 5],
          [TASK.payments, "testing", "Retested refunds", 2.5],
        ],
        blockers:
          i === 0 ? [["Waiting on API keys from the client", false]] : [],
        open: i === 0,
      }),
    ),
    content: {
      tasks: [
        { taskId: TASK.checkout, status: null, note: "" },
        { taskId: TASK.payments, status: null, note: "" },
      ],
      nextWeek: [],
      achievements: [],
      notes: "",
      links: [],
    },
    weekComments: [],
    blockerResolutions: [],
    latestComment: null,
    revisions: [],
  };

  // ---- Nadia: last week, submitted without asking for approval
  const nadiaSubmitted = at(fri1, 1, 10);
  const nadiaLast = {
    _id: id("b1", 4),
    author: NADIA,
    weekKey: lastWeek,
    status: "submitted",
    approvalRequested: false,
    revisionNumber: 1,
    submittedAt: nadiaSubmitted.toISOString(),
    lastActivityAt: nadiaSubmitted.toISOString(),
    days: WEEKDAYS.map((weekday, i) =>
      dayOf(weekday, dates(lastWeek)[i], {
        lines: [
          [TASK.scheduler, "development", "Scheduler prototype", 4],
          [TASK.teamPlanning, "meetings", "Planning, one-to-ones", 2.5],
        ],
        blockers: i === 3 ? [["Design review slipped to next week", true]] : [],
      }),
    ),
    content: {
      tasks: [
        {
          taskId: TASK.scheduler,
          status: "in_progress",
          note: "Prototype runs; needs review",
        },
        { taskId: TASK.teamPlanning, status: "done", note: "" },
      ],
      nextWeek: ["Design review"],
      achievements: [
        {
          _id: next("a1"),
          text: "Scheduler prototype is running",
          isKey: false,
        },
      ],
      notes: "",
      links: [],
    },
    weekComments: [],
    blockerResolutions: [],
    latestComment: null,
    revisions: [],
  };
  nadiaLast.revisions.push({
    revisionNumber: 1,
    approvalRequested: false,
    submittedAt: nadiaLast.submittedAt,
    submittedBy: NADIA,
    action: null,
    comment: null,
    reviewedBy: null,
    reviewedAt: null,
    ...snapshot(nadiaLast),
  });

  // ---- The rest of the team (brand §10). A teammate's week is built from the same
  // two or three lines each day; what differs is which days were posted, the status,
  // and who looked at it.
  //   tasks  [taskId, taskType, text, hours] — one entry per line of a day
  const teammate = ({
    n,
    author,
    weekKey,
    status = "draft",
    ask = false,
    postedDays,
    lines,
    blockers = {},
    submittedAt = null,
    reviewer = null,
    reviewedAt = null,
    feedback = null,
    achievement = null,
    nextWeek = [],
    open = [],
  }) => {
    const weekDates = dates(weekKey);
    const days = postedDays.map((i) =>
      dayOf(WEEKDAYS[i], weekDates[i], {
        lines,
        blockers: blockers[i] ?? [],
        open: open.includes(i),
      }),
    );
    const filed = status !== "draft";
    const taskIds = [...new Set(lines.map(([taskId]) => taskId))];
    const report = {
      _id: id("b1", n),
      author,
      weekKey,
      status,
      approvalRequested: ask,
      revisionNumber: filed ? 1 : 0,
      submittedAt: filed ? submittedAt.toISOString() : null,
      lastActivityAt: filed ? (reviewedAt ?? submittedAt).toISOString() : null,
      days,
      content: {
        tasks: taskIds.map((taskId) => ({
          taskId,
          status: filed ? "in_progress" : null,
          note: filed ? "On track" : "",
        })),
        nextWeek: filed ? nextWeek : [],
        achievements:
          filed && achievement
            ? [{ _id: next("a1"), text: achievement, isKey: false }]
            : [],
        notes: "",
        links: [],
      },
      weekComments: [],
      blockerResolutions: [],
      latestComment: null,
      revisions: [],
    };
    if (filed) {
      report.revisions.push({
        revisionNumber: 1,
        approvalRequested: ask,
        submittedAt: report.submittedAt,
        submittedBy: author,
        action: status === "approved" ? "approved" : null,
        comment: feedback,
        reviewedBy: reviewer,
        reviewedAt: reviewedAt ? reviewedAt.toISOString() : null,
        ...snapshot(report),
      });
    }
    if (status === "approved") {
      const approval = thread(reviewer, feedback, reviewedAt, {
        revisionNumber: 1,
        kind: "approval",
      });
      report.weekComments.push(approval);
      report.latestComment = {
        text: approval.text,
        author: reviewer,
        revisionNumber: 1,
        createdAt: approval.createdAt,
      };
    }
    return report;
  };

  const everyDay = [0, 1, 2, 3, 4];
  const pastIndexes = Array.from({ length: pastDays }, (_, i) => i);
  const friday = (hour) => at(fri1, 0, hour);

  const ruwanLast = teammate({
    n: 5,
    author: RUWAN,
    weekKey: lastWeek,
    status: "submitted",
    ask: true,
    postedDays: everyDay,
    lines: [
      [TASK.migration, "development", "Staging migration scripts", 5],
      [TASK.adminReports, "testing", "Checked the admin report exports", 3],
    ],
    blockers: { 1: [["Staging migration needs IT approval", true]] },
    submittedAt: friday(16),
    nextWeek: ["Run the migration on staging"],
    achievement: "Migration scripts pass on a copy of production",
  });
  const tharinduLast = teammate({
    n: 6,
    author: THARINDU,
    weekKey: lastWeek,
    status: "approved",
    ask: true,
    postedDays: everyDay,
    lines: [
      [TASK.mobile, "development", "Mobile layout for the basket", 5],
      [TASK.reviews, "review", "Pull request reviews", 2.5],
    ],
    submittedAt: friday(15),
    reviewer: NADIA,
    reviewedAt: friday(19),
    feedback: "Clear week. Approved.",
    nextWeek: ["Tablet layout"],
    achievement: "Basket works on small screens",
  });
  const ayeshaLast = teammate({
    n: 7,
    author: AYESHA,
    weekKey: lastWeek,
    status: "submitted",
    ask: true,
    postedDays: everyDay,
    lines: [
      [TASK.launchCopy, "documentation", "Launch page copy", 4],
      [TASK.newsletter, "meetings", "Newsletter planning with design", 3],
    ],
    submittedAt: friday(17),
    nextWeek: ["Sign-off on the launch copy"],
    achievement: "First draft of the launch page",
  });
  const malithLast = teammate({
    n: 8,
    author: MALITH,
    weekKey: lastWeek,
    status: "approved",
    ask: true,
    postedDays: everyDay,
    lines: [
      [
        TASK.benchmarks,
        "research_study",
        "Benchmarked three storage options",
        4,
      ],
      [TASK.benchmarks, "documentation", "Wrote up the results", 3.5],
    ],
    submittedAt: friday(14),
    reviewer: SANDUNI,
    reviewedAt: friday(18),
    feedback: "Useful numbers. Approved.",
    nextWeek: ["Pick one option"],
    achievement: "Benchmarks are in one table",
  });

  // This week: Drafts. Ayesha missed the first day behind us, Dinesh has posted
  // nothing yet, and Malith is on leave from Monday (no report: not expected).
  const draftWeek = (n, author, lines, extra = {}) =>
    teammate({
      n,
      author,
      weekKey: thisWeek,
      postedDays: pastIndexes,
      lines,
      ...extra,
    });
  const ruwanNow = draftWeek(
    9,
    RUWAN,
    [
      [TASK.migration, "development", "Staging migration run", 5],
      [TASK.adminReports, "development", "Export filters", 2.5],
    ],
    { blockers: { 0: [["Waiting on the staging database", false]] } },
  );
  const tharinduNow = draftWeek(10, THARINDU, [
    [TASK.mobile, "development", "Tablet layout", 5.5],
    [TASK.reviews, "testing", "Retested the basket on a phone", 2],
  ]);
  const ayeshaNow = draftWeek(
    11,
    AYESHA,
    [
      [TASK.launchCopy, "documentation", "Launch copy edits", 4],
      [TASK.newsletter, "other", "Newsletter list clean-up", 3],
    ],
    {
      // Missing the first day behind us, once there is more than one.
      postedDays: pastIndexes.slice(pastDays > 1 ? 1 : 0),
      blockers: {
        [pastDays > 1 ? 1 : 0]: [["Launch copy waiting on sign-off", false]],
      },
    },
  );
  const nadiaNow = draftWeek(12, NADIA, [
    [TASK.scheduler, "development", "Scheduler prototype", 4],
    [TASK.designReview, "meetings", "Design review prep", 2.5],
  ]);
  const sanduniNow = draftWeek(13, SANDUNI, [
    [TASK.roadmap, "meetings", "Roadmap review", 3],
    [TASK.roadmap, "documentation", "Hiring plan", 3.5],
  ]);

  // What `team: false` leaves out: everyone but the three perspectives, with their
  // projects, tasks, reports and the holiday. The unit tests of the rules use it, so
  // they run on the smallest data that shows each rule.
  const teamUsers = [
    {
      _id: RUWAN,
      name: "Ruwan P.",
      email: "ruwan@example.com",
      role: "member",
      status: "active",
      isOwner: false,
      onLeave: false,
      leaveFrom: null,
      leaveHistory: [],
      removedAt: null,
      joinedAt: joined,
      projectIds: [PROJECT.internal],
    },
    {
      _id: THARINDU,
      name: "Tharindu S.",
      email: "tharindu@example.com",
      role: "member",
      status: "active",
      isOwner: false,
      onLeave: false,
      leaveFrom: null,
      leaveHistory: [],
      removedAt: null,
      joinedAt: joined,
      projectIds: [PROJECT.clientA],
    },
    {
      _id: AYESHA,
      name: "Ayesha C.",
      email: "ayesha@example.com",
      role: "member",
      status: "active",
      isOwner: false,
      onLeave: false,
      leaveFrom: null,
      leaveHistory: [],
      removedAt: null,
      joinedAt: joined,
      projectIds: [PROJECT.marketing],
    },
    {
      _id: DINESH,
      name: "Dinesh K.",
      email: "dinesh@example.com",
      role: "member",
      status: "active",
      isOwner: false,
      onLeave: false,
      leaveFrom: null,
      leaveHistory: [],
      removedAt: null,
      joinedAt: joined,
      projectIds: [PROJECT.internal],
    },
    {
      _id: MALITH,
      name: "Malith W.",
      email: "malith@example.com",
      role: "member",
      status: "active",
      isOwner: false,
      // On leave since Monday: the whole week is "On leave", not "Not started".
      onLeave: true,
      leaveFrom: toCalendarDate(nowDates[0]),
      leaveHistory: [
        { from: nowDates[0].toISOString(), to: null, setBy: NADIA },
      ],
      removedAt: null,
      joinedAt: joined,
      projectIds: [PROJECT.rnd],
    },
  ];
  const teamProjects = [
    {
      _id: PROJECT.internal,
      name: "Internal tools",
      description: "Staging, pipelines and the admin site",
      status: "active",
      plan: {
        startDate: toCalendarDate(weekDays(addWeeks(thisWeek, -3))[0].date),
        plannedDays: 40,
        plannedHours: 240,
      },
      planHistory: [],
    },
    {
      _id: PROJECT.marketing,
      name: "Marketing",
      description: "Launch page and newsletter",
      status: "active",
      plan: null,
      planHistory: [],
    },
  ];
  const teamTasks = [
    task(TASK.migration, "Staging migration", PROJECT.internal, RUWAN),
    task(TASK.adminReports, "Admin reports", PROJECT.internal, RUWAN),
    task(TASK.mobile, "Mobile layout", PROJECT.clientA, THARINDU),
    task(TASK.reviews, "Pull request reviews", PROJECT.clientA, THARINDU),
    task(TASK.launchCopy, "Launch copy", PROJECT.marketing, AYESHA),
    task(TASK.newsletter, "Newsletter", PROJECT.marketing, AYESHA),
    task(TASK.pipeline, "Build pipeline", PROJECT.internal, DINESH),
    task(TASK.benchmarks, "Storage benchmarks", PROJECT.rnd, MALITH),
    task(TASK.roadmap, "Roadmap and hiring", PROJECT.internal, SANDUNI),
    task(TASK.designReview, "Design review", PROJECT.rnd, NADIA),
  ];
  const teamReports = [
    nadiaNow,
    ruwanLast,
    ruwanNow,
    tharinduLast,
    tharinduNow,
    ayeshaLast,
    ayeshaNow,
    malithLast,
    sanduniNow,
  ];
  // One day off in the current week, so the table shows the holiday square: the next
  // working day, or Monday of next week when the week has none left.
  const teamHolidays = [
    {
      _id: id("a2", 1),
      date: toCalendarDate(
        todayIndex < 4
          ? nowDates[todayIndex + 1]
          : weekDays(addWeeks(thisWeek, 1))[0].date,
      ),
      name: "Company day off",
      createdBy: SANDUNI,
    },
  ];

  return {
    users: [
      {
        _id: IMALI,
        name: "Imali J.",
        email: "imali@example.com",
        role: "member",
        status: "active",
        isOwner: false,
        onLeave: false,
        leaveFrom: null,
        leaveHistory: [],
        removedAt: null,
        joinedAt: joined,
        projectIds: [PROJECT.clientA, PROJECT.rnd],
      },
      {
        _id: NADIA,
        name: "Nadia F.",
        email: "nadia@example.com",
        role: "manager",
        status: "active",
        isOwner: false,
        onLeave: false,
        leaveFrom: null,
        leaveHistory: [],
        removedAt: null,
        joinedAt: joined,
        projectIds: [PROJECT.rnd],
      },
      {
        _id: SANDUNI,
        name: "Sanduni B.",
        email: "sanduni@example.com",
        role: "admin",
        status: "active",
        isOwner: true,
        onLeave: false,
        leaveFrom: null,
        leaveHistory: [],
        removedAt: null,
        joinedAt: joined,
        projectIds: team ? [PROJECT.internal] : [],
      },
      ...(team ? teamUsers : []),
    ],
    // Client A has hours planned and time to spare; R&D's plan ran out last week.
    projects: [
      {
        _id: PROJECT.clientA,
        name: "Client A",
        description: "Checkout and payments for the client's shop",
        status: "active",
        plan: {
          startDate: toCalendarDate(weekDays(addWeeks(thisWeek, -6))[0].date),
          plannedDays: 50,
          plannedHours: 300,
        },
        planHistory: [],
      },
      {
        _id: PROJECT.rnd,
        name: "R&D",
        description: "Prototypes and research",
        status: "active",
        plan: {
          startDate: toCalendarDate(weekDays(addWeeks(thisWeek, -6))[0].date),
          plannedDays: 25,
          plannedHours: null,
        },
        planHistory: [],
      },
      ...(team ? teamProjects : []),
    ],
    // Tasks are personal: each has an owner. Done tasks drop out of the picker.
    tasks: [
      task(TASK.checkout, "Checkout redesign", PROJECT.clientA, IMALI),
      task(TASK.payments, "Payments integration", PROJECT.clientA, IMALI),
      task(TASK.auth, "Login timeout", PROJECT.clientA, IMALI, approvedAt),
      task(TASK.scheduler, "Scheduler prototype", PROJECT.rnd, NADIA),
      task(
        TASK.research,
        "Card-vault research",
        PROJECT.rnd,
        IMALI,
        sentBackAt,
      ),
      task(TASK.planning, "Sprint planning", PROJECT.rnd, IMALI, approvedAt),
      task(
        TASK.teamPlanning,
        "Team planning",
        PROJECT.rnd,
        NADIA,
        nadiaSubmitted,
      ),
      ...(team ? teamTasks : []),
    ],
    reports: [
      imaliNow,
      imaliLast,
      imaliOlder,
      nadiaLast,
      ...(team ? teamReports : []),
    ],
    // When each person last opened each report: `${reportId}:${userId}` → ISO date.
    seen: {
      [`${imaliOlder._id}:${IMALI}`]: subMinutes(now, 5).toISOString(),
    },
    // { _id, date: "YYYY-MM-DD", name, createdBy }. Read by dayStates and HD1;
    // written by the holidays page's handlers (C8).
    holidays: team ? teamHolidays : [],
  };
}
