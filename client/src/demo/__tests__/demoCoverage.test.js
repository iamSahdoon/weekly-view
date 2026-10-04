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
  },
  userService: {
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
  },
  reviewService: {
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
