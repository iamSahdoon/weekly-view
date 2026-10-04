import { addDays, addHours, subMinutes, subWeeks } from "date-fns";
import { WEEKDAYS } from "../lib/constants.js";
import { addWeeks, currentWeekKey, weekDays } from "../lib/dates.js";

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

// Ids are 24 hex digits like the API's: two for the kind, the rest a counter.
const id = (kind, n) => `${kind}${String(n).padStart(22, "0")}`;
const PROJECT = { clientA: id("0b", 1), rnd: id("0b", 2) };
const TASK = {
  checkout: id("0c", 1),
  payments: id("0c", 2),
  auth: id("0c", 3),
  scheduler: id("0c", 4),
  research: id("0c", 5),
  planning: id("0c", 6),
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

export function buildFixtures(now = new Date()) {
  counter = 0;
  const joined = subWeeks(now, 26).toISOString();
  const thisWeek = currentWeekKey(now);
  const lastWeek = addWeeks(thisWeek, -1);
  const olderWeek = addWeeks(thisWeek, -2);
  // Days of the current week that are behind us (Monday on a Monday).
  const todayIndex = Math.min(4, (now.getDay() + 6) % 7);
  const pastDays = Math.max(1, todayIndex);

  const dates = (weekKey) => weekDays(weekKey).map((d) => d.date);

  // ---- Imali: last week, sent back
  const [mon1, tue1, wed1, thu1, fri1] = dates(lastWeek);
  const sentBackAt = at(fri1, 3, 9);
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
          [TASK.planning, "meetings", "Planning, one-to-ones", 2.5],
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
        { taskId: TASK.planning, status: "done", note: "" },
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
        joinedAt: joined,
        projectIds: [],
      },
    ],
    projects: [
      { _id: PROJECT.clientA, name: "Client A", status: "active" },
      { _id: PROJECT.rnd, name: "R&D", status: "active" },
    ],
    tasks: [
      {
        _id: TASK.checkout,
        name: "Checkout redesign",
        project: PROJECT.clientA,
      },
      {
        _id: TASK.payments,
        name: "Payments integration",
        project: PROJECT.clientA,
      },
      { _id: TASK.auth, name: "Login timeout", project: PROJECT.clientA },
      {
        _id: TASK.scheduler,
        name: "Scheduler prototype",
        project: PROJECT.rnd,
      },
      { _id: TASK.research, name: "Card-vault research", project: PROJECT.rnd },
      { _id: TASK.planning, name: "Sprint planning", project: PROJECT.rnd },
    ],
    reports: [imaliNow, imaliLast, imaliOlder, nadiaLast],
    // When each person last opened each report: `${reportId}:${userId}` → ISO date.
    seen: {
      [`${imaliOlder._id}:${IMALI}`]: subMinutes(now, 5).toISOString(),
    },
    // Unused until holidays and leave have demo handlers (C8).
    holidays: [],
  };
}
