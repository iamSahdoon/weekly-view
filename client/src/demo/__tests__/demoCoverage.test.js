import { beforeAll, describe, expect, it } from "vitest";
import { apiClient } from "../../services/apiClient.js";
import { createDemoAdapter } from "../demoAdapter.js";
import { addWeeks, currentWeekKey } from "../../lib/dates.js";
import { createDemoStore } from "../demoStore.js";
import { PERSPECTIVES } from "../fixtures.js";

// Every function in services/ answered by the demo adapter (frontend_architecture.md
// §11.5). A service gaining a function without a case here fails the first test;
// a case answered by the "no such route" 404 fails the second. Each case checks
// the keys its hook reads, or the real error code a page expects.

const services = import.meta.glob("../../services/*Service.js", {
  eager: true,
});

const ME_KEYS = [
  "_id",
  "name",
  "email",
  "role",
  "status",
  "projects",
  "joinedAt",
  "isOwner",
  "onLeave",
  "owner",
];
const hasKeys = (keys) => (data) =>
  expect(Object.keys(data)).toEqual(expect.arrayContaining(keys));
const rejects = (code) => ({ rejects: code });

// The fixtures' ids change per run (their dates are relative), so a case whose
// arguments name a report or a thread takes them from the store: `args(ctx)`.
let ctx = null;
const WEEK_VIEW_KEYS = [
  "user",
  "weekKey",
  "weekStart",
  "weekEnd",
  "expectedDays",
  "dayStates",
  "state",
  "report",
];
const DAY_KEYS = ["weekday", "lines", "blockers", "comments", "canComment"];
const THREAD_KEYS = [
  "_id",
  "author",
  "text",
  "editableUntil",
  "replies",
  "isNew",
];

const CASES = {
  reportService: {
    getMyWeek: {
      args: () => [currentWeekKey()],
      check: (view) => {
        hasKeys(WEEK_VIEW_KEYS)(view);
        expect(view.user._id).toBe(PERSPECTIVES.member);
        expect(view.report.status).toBe("draft");
      },
    },
    getReport: {
      args: () => [ctx.imaliLast._id],
      check: (view) => hasKeys(WEEK_VIEW_KEYS)(view),
    },
    listRevisions: {
      args: () => [ctx.imaliOlder._id],
      check: (data) =>
        expect(data.items.map((r) => r.revisionNumber)).toEqual([2, 1]),
    },
    getRevision: {
      args: () => [ctx.imaliOlder._id, 1],
      check: hasKeys(["revisionNumber", "isCurrent", "content", "days"]),
    },
    setResolution: {
      args: () => [ctx.imaliNow._id, ctx.imaliNow.days[0].blockers[0]._id],
      check: (data) => expect(data.resolvedAt).not.toBeNull(),
    },
    clearResolution: {
      args: () => [ctx.imaliNow._id, ctx.imaliNow.days[0].blockers[0]._id],
      check: (data) => expect(data.resolvedAt).toBeNull(),
    },
    setTeamComments: {
      args: () => [ctx.imaliNow._id, "mon", false],
      check: (day) => {
        hasKeys(DAY_KEYS)(day);
        expect(day.openToTeam).toBe(false);
      },
    },
    markSeen: {
      args: () => [ctx.imaliLast._id],
      check: (data) => expect(data).toBeNull(),
    },
    listMyReports: {
      args: [{ limit: 20, sort: "weekKey", dir: "desc" }],
      check: (data) => {
        expect(data.meta.total).toBe(3);
        expect(data.items.map((r) => r.weekKey)).toEqual([
          currentWeekKey(),
          addWeeks(currentWeekKey(), -1),
          addWeeks(currentWeekKey(), -2),
        ]);
        hasKeys(["status", "hours", "projects", "postedWeekdays", "isNew"])(
          data.items[0],
        );
      },
    },
    getSummary: {
      args: () => [{ weekKey: currentWeekKey(), month: "2026-01" }],
      check: (data) => {
        hasKeys(["weeksFiled", "hoursThisMonth", "openBlockers"])(data);
        expect(data.weeksFiled).toBe(2);
      },
    },
    // Monday of the current week is always behind us (or today), so it can be edited.
    putDay: {
      args: () => [
        currentWeekKey(),
        "mon",
        {
          lines: [
            {
              _id: ctx.imaliNow.days[0].lines[0]._id,
              task: ctx.imaliNow.days[0].lines[0].taskId,
              taskType: "testing",
              text: "Edited in the demo",
              hours: 2.5,
            },
          ],
          blockers: [
            {
              _id: ctx.imaliNow.days[0].blockers[0]._id,
              text: "Waiting on API keys from the client",
            },
          ],
          openToTeam: true,
        },
      ],
      check: (view) => {
        hasKeys(WEEK_VIEW_KEYS)(view);
        const monday = view.report.days.find((d) => d.weekday === "mon");
        expect(monday.lines).toHaveLength(1);
        expect(monday.lines[0].text).toBe("Edited in the demo");
        expect(monday.editedAt).not.toBeNull();
      },
    },
    // The end-of-week content of the current week's Draft (R6).
    saveContent: {
      args: () => [
        ctx.imaliNow._id,
        {
          tasks: [
            { task: ctx.imaliNow.content.tasks[0].taskId, status: "done" },
          ],
          nextWeek: ["Shipping options"],
          notes: "Saved by the demo",
        },
      ],
      check: (view) => {
        hasKeys(WEEK_VIEW_KEYS)(view);
        expect(view.report.tasks[0].status).toBe("done");
        expect(view.report.content.nextWeek).toEqual(["Shipping options"]);
        expect(view.report.content.notes).toBe("Saved by the demo");
      },
    },
    // Friday of the current week is never posted in the fixtures, so the submit rules
    // refuse it with the server's code (the full submit: demoContent.test.js).
    submitReport: {
      args: () => [ctx.imaliNow._id, { requestApproval: false }],
      ...rejects("VALIDATION_FAILED"),
    },
    // Everyone sees everyone's day; the viewer comes first (the content: demoReview.test.js).
    listTeamUpdates: {
      args: () => [
        {
          weekKey: addWeeks(currentWeekKey(), -1),
          weekday: "mon",
          project: undefined,
          blockersOnly: undefined,
        },
      ],
      check: (data) => {
        expect(data.items.map((e) => e.user._id)).toEqual([
          PERSPECTIVES.member,
          PERSPECTIVES.manager,
          PERSPECTIVES.admin,
        ]);
        hasKeys(["user", "state", "reportId", "day"])(data.items[0]);
        expect(data.items[0].state).toBe("posted");
      },
    },
  },
  taskService: {
    listTasks: {
      args: [],
      check: (data) =>
        expect(data.items.map((t) => t.name).sort()).toEqual([
          "Checkout redesign",
          "Payments integration",
        ]),
    },
  },
  projectService: {
    listProjects: {
      args: [{ mine: true }],
      check: (data) => {
        expect(data.items.map((p) => p.name)).toEqual(["Client A", "R&D"]);
        hasKeys(["plan", "daysUsed", "daysLeft", "overdueDays", "hoursLogged"])(
          data.items[0].progress,
        );
      },
    },
  },
  holidayService: {
    listHolidays: {
      args: [{ from: "2026-01-01", to: "2026-12-31" }],
      check: (data) => expect(data.items).toEqual([]),
    },
  },
  userService: {
    // The people list is for managers and admins; a member is refused (the content:
    // demoReview.test.js).
    listUsers: { args: [{ limit: 100 }], ...rejects("FORBIDDEN") },
    // A teammate's week: the days, and no end-of-week layer at all.
    getUserWeek: {
      args: () => [PERSPECTIVES.manager, addWeeks(currentWeekKey(), -1)],
      check: (view) => {
        hasKeys(WEEK_VIEW_KEYS)(view);
        expect(view.report.days.length).toBe(5);
        expect(view.report.content).toBeNull();
        expect(view.report.weekComments).toBeNull();
        expect(view.report.contentSource).toBe("withheld");
      },
    },
    setLeave: {
      args: [PERSPECTIVES.member, false],
      check: (me) => {
        hasKeys(ME_KEYS)(me);
        expect(me.onLeave).toBe(false);
      },
    },
    listOnLeave: {
      args: [],
      check: (data) => expect(Array.isArray(data.items)).toBe(true),
    },
  },
  reviewService: {
    // The three review calls are for managers and admins; a member is refused (the
    // content: demoReview.test.js).
    approve: {
      args: () => [ctx.imaliLast._id, { revisionNumber: 1 }],
      ...rejects("FORBIDDEN"),
    },
    sendBack: {
      args: () => [
        ctx.imaliLast._id,
        { revisionNumber: 1, comment: "Please add the missing notes." },
      ],
      ...rejects("FORBIDDEN"),
    },
    listReviewDesk: { args: [{ page: 1, limit: 20 }], ...rejects("FORBIDDEN") },
    commentOnDay: {
      args: () => [ctx.imaliLast._id, "mon", "Thanks for the note."],
      check: (day) => {
        hasKeys(DAY_KEYS)(day);
        expect(day.comments.at(-1).text).toBe("Thanks for the note.");
      },
    },
    commentOnWeek: {
      args: () => [ctx.imaliLast._id, "A member can't start one."],
      ...rejects("FORBIDDEN"),
    },
    reply: {
      args: () => [ctx.imaliLast._id, ctx.sendBack._id, "Fixed."],
      check: (thread) => {
        hasKeys(THREAD_KEYS)(thread);
        expect(thread.replies.at(-1).text).toBe("Fixed.");
      },
    },
    editComment: {
      args: () => [ctx.imaliLast._id, ctx.sendBack._id, "Not mine to edit."],
      ...rejects("EDIT_WINDOW_CLOSED"),
    },
    editReply: {
      args: () => [
        ctx.imaliLast._id,
        ctx.sendBack._id,
        ctx.sendBack.replies[0]._id,
        "Too late.",
      ],
      ...rejects("EDIT_WINDOW_CLOSED"),
    },
    deleteComment: {
      args: () => [ctx.imaliLast._id, ctx.sendBack._id],
      ...rejects("EDIT_WINDOW_CLOSED"),
    },
    deleteReply: {
      args: () => [
        ctx.imaliLast._id,
        ctx.sendBack._id,
        ctx.sendBack.replies[0]._id,
      ],
      ...rejects("EDIT_WINDOW_CLOSED"),
    },
  },
  dashboardService: {
    // The seven blocks are for managers and admins; a member is refused (the content:
    // demoDashboard.test.js).
    getSummary: {
      args: () => [{ weekKey: currentWeekKey() }],
      ...rejects("FORBIDDEN"),
    },
    getTeam: {
      args: () => [{ weekKey: currentWeekKey() }],
      ...rejects("FORBIDDEN"),
    },
    getTrend: {
      args: () => [{ endWeek: currentWeekKey() }],
      ...rejects("FORBIDDEN"),
    },
    getHours: {
      args: () => [{ weekKey: currentWeekKey() }],
      ...rejects("FORBIDDEN"),
    },
    getWorkload: {
      args: () => [{ weekKey: currentWeekKey() }],
      ...rejects("FORBIDDEN"),
    },
    getActivity: { args: [], ...rejects("FORBIDDEN") },
    getProjects: {
      args: () => [{ weekKey: currentWeekKey() }],
      ...rejects("FORBIDDEN"),
    },
  },
  authService: {
    getBootstrap: { args: [], check: hasKeys(["available"]) },
    signUp: {
      args: [{ name: "A", email: "a@example.com", password: "password1" }],
      ...rejects("SIGNUP_CLOSED"),
    },
    login: {
      args: [{ email: "imali@example.com", password: "password1" }],
      ...rejects("FORBIDDEN"),
    },
    getMe: { args: [], check: hasKeys(ME_KEYS) },
    updateMe: {
      args: [{ name: "Imali Jayasuriya" }],
      check: (me) => expect(me.name).toBe("Imali Jayasuriya"),
    },
    changePassword: {
      args: [{ currentPassword: "x", newPassword: "password2" }],
      check: (data) => hasKeys(ME_KEYS)(data.user),
    },
    previewLink: { args: [{ token: "sample" }], ...rejects("LINK_INVALID") },
    acceptLink: {
      args: [{ token: "sample", password: "password1" }],
      ...rejects("LINK_INVALID"),
    },
  },
};

const argsOf = (testCase) =>
  typeof testCase.args === "function" ? testCase.args() : testCase.args;
const moduleName = (path) => path.split("/").pop().replace(".js", "");
const functionsOf = (module) =>
  Object.entries(module).filter(([, value]) => typeof value === "function");

beforeAll(() => {
  const store = createDemoStore();
  store.session.userId = PERSPECTIVES.member;
  const last = addWeeks(currentWeekKey(), -1);
  const reportOf = (author, weekKey) =>
    store.reports.find((r) => r.author === author && r.weekKey === weekKey);
  const imaliLast = reportOf(PERSPECTIVES.member, last);
  ctx = {
    imaliLast,
    imaliNow: reportOf(PERSPECTIVES.member, currentWeekKey()),
    imaliOlder: reportOf(PERSPECTIVES.member, addWeeks(currentWeekKey(), -2)),
    sendBack: imaliLast.weekComments[0],
  };
  apiClient.defaults.adapter = createDemoAdapter(store, { latency: 0 });
});

describe("demo coverage", () => {
  it("has a case for every service function", () => {
    const missing = [];
    for (const [path, module] of Object.entries(services)) {
      for (const [name] of functionsOf(module)) {
        if (!CASES[moduleName(path)]?.[name])
          missing.push(`${moduleName(path)}.${name}`);
      }
    }
    expect(missing).toEqual([]);
  });

  for (const [path, module] of Object.entries(services)) {
    for (const [name, fn] of functionsOf(module)) {
      const testCase = CASES[moduleName(path)]?.[name];
      if (!testCase) continue;
      it(`answers ${moduleName(path)}.${name}`, async () => {
        if (testCase.rejects) {
          const error = await fn(...argsOf(testCase)).catch((e) => e);
          expect(error.name).toBe("ApiError");
          expect(error.code).toBe(testCase.rejects);
        } else {
          testCase.check(await fn(...argsOf(testCase)));
        }
      });
    }
  }

  it("never reaches the network: an unknown route is the 404 envelope", async () => {
    const error = await apiClient.get("/nowhere").catch((e) => e);
    expect(error.code).toBe("ROUTE_NOT_FOUND");
    expect(error.httpStatus).toBe(404);
  });
});
