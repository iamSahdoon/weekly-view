import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import * as dashboardService from "../../services/dashboardService.js";
import * as markerService from "../../services/markerService.js";
import * as reportService from "../../services/reportService.js";
import * as reviewService from "../../services/reviewService.js";
import * as userService from "../../services/userService.js";
import { apiClient } from "../../services/apiClient.js";
import { addWeeks, currentWeekKey } from "../../lib/dates.js";
import { createDemoAdapter } from "../demoAdapter.js";
import { createDemoStore } from "../demoStore.js";
import { PERSPECTIVES } from "../fixtures.js";

// The demo's whole cast (brand §10), as the fixtures build it: eight people, a review
// desk with something waiting in it, and a week that holds every square the dashboard
// draws. The other demo suites run on `{ team: false }` — the three perspectives only —
// so each rule is read on the smallest data; this one reads the real thing. The clock is
// frozen on a Wednesday: Monday and Tuesday are behind, Thursday is the day off.

let store;
const as = (role) => {
  store.session.userId = PERSPECTIVES[role];
};
const failure = (promise) =>
  promise.then(
    () => null,
    (error) => error,
  );

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 7, 10, 0)); // Wednesday, 2026-W41
});
afterAll(() => vi.useRealTimers());

beforeEach(() => {
  store = createDemoStore();
  apiClient.defaults.adapter = createDemoAdapter(store, { latency: 0 });
  as("manager");
});

const THIS = "2026-W41";
const LAST = addWeeks(THIS, -1);
const NAMES = [
  "Ayesha C.",
  "Dinesh K.",
  "Imali J.",
  "Malith W.",
  "Nadia F.",
  "Ruwan P.",
  "Sanduni B.",
  "Tharindu S.",
];

describe("the cast", () => {
  it("is on a frozen Wednesday", () => {
    expect(currentWeekKey()).toBe(THIS);
  });

  it("is the eight people of brand §10 — three perspectives and five teammates", async () => {
    const page = await userService.listUsers({ limit: 100 });
    expect(page.items.map((u) => u.name)).toEqual(NAMES);
    const roles = Object.fromEntries(page.items.map((u) => [u.name, u.role]));
    expect(roles["Imali J."]).toBe("member");
    expect(roles["Nadia F."]).toBe("manager");
    expect(roles["Sanduni B."]).toBe("admin");
  });

  it("minimal fixtures leave out the five teammates and everything of theirs", () => {
    const minimal = createDemoStore(undefined, { team: false });
    expect(minimal.users).toHaveLength(3);
    expect(minimal.projects).toHaveLength(2);
    expect(minimal.holidays).toEqual([]);
    expect(
      minimal.reports.every((r) =>
        Object.values(PERSPECTIVES).includes(r.author),
      ),
    ).toBe(true);
  });
});

describe("the review desk is not empty", () => {
  it("lists a Submitted report that asked for approval, written by someone who is not reviewing it", async () => {
    for (const role of ["manager", "admin"]) {
      as(role);
      const { items } = await reviewService.listReviewDesk({});
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(item).toMatchObject({
          status: "submitted",
          approvalRequested: true,
          isNew: true,
        });
        expect(item.author._id).not.toBe(PERSPECTIVES[role]);
      }
    }
    as("manager");
    const authors = (await reviewService.listReviewDesk({})).items.map(
      (r) => r.author.name,
    );
    expect(authors).toEqual(expect.arrayContaining(["Ruwan P.", "Ayesha C."]));
  });

  it("counts them for the sidebar (V4), and lights My reports for the author whose report came back", async () => {
    const count = await reviewService.getReviewDeskCount();
    expect(count.count).toBe(2);
    as("member");
    const marks = await markerService.getNewMarks();
    expect(marks.nav.myReports).toBe(true);
  });

  it("is refused to a member", async () => {
    as("member");
    expect((await failure(reviewService.listReviewDesk({}))).code).toBe(
      "FORBIDDEN",
    );
  });
});

describe("the team table draws every square", () => {
  const rows = async () => {
    const { items } = await dashboardService.getTeam({
      weekKey: THIS,
      limit: 20,
    });
    return Object.fromEntries(items.map((r) => [r.user.name, r]));
  };

  it("has a row for each of the eight", async () => {
    expect(Object.keys(await rows()).sort()).toEqual(NAMES);
  });

  it("shows posted, missing, not posted yet, later this week, holiday and on leave", async () => {
    const byName = await rows();
    // Imali posted Monday and Tuesday; today is Wednesday; Thursday is the day off.
    expect(byName["Imali J."].dayStates).toMatchObject({
      mon: "posted",
      tue: "posted",
      wed: "today",
      thu: "holiday",
      fri: "future",
    });
    // Ayesha did not post Monday.
    expect(byName["Ayesha C."].dayStates).toMatchObject({
      mon: "missing",
      tue: "posted",
    });
    // Dinesh has posted nothing: both days behind are missing, and he has not started.
    expect(byName["Dinesh K."].dayStates).toMatchObject({
      mon: "missing",
      tue: "missing",
    });
    expect(byName["Dinesh K."].state).toBe("not_started");
    // Malith is on leave for the whole week.
    expect(byName["Malith W."].state).toBe("on_leave");
    expect(Object.values(byName["Malith W."].dayStates)).toContain("leave");
  });

  it("holds Submitted and Approved weeks from last week, and an open blocker or two", async () => {
    const { items } = await dashboardService.getTeam({
      weekKey: LAST,
      limit: 20,
    });
    const states = items.map((r) => r.state);
    expect(states).toEqual(
      expect.arrayContaining(["submitted", "approved", "needs_correction"]),
    );
    const summary = await dashboardService.getSummary({ weekKey: THIS });
    expect(summary.openBlockers.count).toBeGreaterThanOrEqual(2);
  });
});

describe("any day of the week", () => {
  it("builds the same cast, with something in the review desk and one day off", async () => {
    // Monday 2026-10-05 to Sunday 2026-10-11.
    for (let day = 5; day <= 11; day += 1) {
      vi.setSystemTime(new Date(2026, 9, day, 10, 0));
      store = createDemoStore();
      apiClient.defaults.adapter = createDemoAdapter(store, { latency: 0 });
      as("manager");
      const { items } = await reviewService.listReviewDesk({});
      expect(items.length, `desk on 2026-10-${day}`).toBeGreaterThan(0);
      expect(store.users, `cast on 2026-10-${day}`).toHaveLength(8);
      expect(store.holidays, `holiday on 2026-10-${day}`).toHaveLength(1);
      // A weekday, so a working day is taken.
      const [h] = store.holidays;
      expect([0, 6]).not.toContain(new Date(`${h.date}T12:00:00`).getDay());
    }
    vi.setSystemTime(new Date(2026, 9, 7, 10, 0));
  });
});

describe("a weekend", () => {
  // The whole week is behind us: Friday is posted for everyone except the deliberate cases,
  // and the member can still submit once her tasks have a status.
  it.each([
    ["Saturday", 10],
    ["Sunday", 11],
  ])(
    "posts Friday for everyone but the deliberate cases on a %s",
    async (_name, day) => {
      vi.setSystemTime(new Date(2026, 9, day, 10, 0)); // 2026-W41
      store = createDemoStore();
      apiClient.defaults.adapter = createDemoAdapter(store, { latency: 0 });
      as("manager");
      const { items } = await dashboardService.getTeam({
        weekKey: THIS,
        limit: 20,
      });
      const byName = Object.fromEntries(items.map((r) => [r.user.name, r]));

      for (const name of [
        "Imali J.",
        "Nadia F.",
        "Ruwan P.",
        "Sanduni B.",
        "Tharindu S.",
      ]) {
        expect(Object.values(byName[name].dayStates), name).toEqual([
          "posted",
          "posted",
          "posted",
          "posted",
          "posted",
        ]);
      }
      // Ayesha's one missing day, her Monday.
      expect(byName["Ayesha C."].dayStates).toEqual({
        mon: "missing",
        tue: "posted",
        wed: "posted",
        thu: "posted",
        fri: "posted",
      });
      // Dinesh has not started; Malith is on leave.
      expect(byName["Dinesh K."].state).toBe("not_started");
      expect(
        Object.values(byName["Dinesh K."].dayStates).every(
          (s) => s === "missing",
        ),
      ).toBe(true);
      expect(byName["Malith W."].state).toBe("on_leave");
      // Nobody but those three has a "missing" Friday.
      const missingFriday = items
        .filter((r) => r.dayStates.fri === "missing")
        .map((r) => r.user.name);
      expect(missingFriday).toEqual(["Dinesh K."]);

      // The day off is next Monday, a working day of a later week.
      const [holiday] = store.holidays;
      expect(holiday.date).toBe("2026-10-12");

      // The member can still submit: a status on each task, then R7 accepts the week.
      as("member");
      const report = store.reports.find(
        (r) => r.author === PERSPECTIVES.member && r.weekKey === THIS,
      );
      expect(report.days).toHaveLength(5);
      const refused = await failure(
        reportService.submitReport(report._id, { requestApproval: false }),
      );
      expect(refused.code).toBe("VALIDATION_FAILED");
      await reportService.saveContent(report._id, {
        tasks: report.content.tasks.map((t) => ({
          task: t.taskId,
          status: "in_progress",
          note: "On track",
        })),
      });
      const view = await reportService.submitReport(report._id, {
        requestApproval: false,
      });
      expect(view.report.status).toBe("submitted");
    },
  );
});
