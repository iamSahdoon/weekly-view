import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import * as holidayService from "../../services/holidayService.js";
import * as projectService from "../../services/projectService.js";
import * as reportService from "../../services/reportService.js";
import * as taskService from "../../services/taskService.js";
import * as userService from "../../services/userService.js";
import { apiClient } from "../../services/apiClient.js";
import { addWeeks, currentWeekKey } from "../../lib/dates.js";
import { createDemoAdapter } from "../demoAdapter.js";
import { createDemoStore } from "../demoStore.js";
import { PERSPECTIVES } from "../fixtures.js";

// Writing a day in the demo (api_specification.md §2.5 R5) and what This week reads
// beside it (R1, R2, T1, P1, HD1, U9, U10). The clock is frozen on a Wednesday, so
// Monday and Tuesday are behind, Wednesday is today and Thursday and Friday are ahead.

let store;
const as = (role) => {
  store.session.userId = PERSPECTIVES[role];
};
const code = (promise) =>
  promise.then(
    () => null,
    (error) => error.code,
  );
const reasonOf = (promise) =>
  promise.then(
    () => null,
    (error) => error.details?.reason,
  );

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 7, 10, 0)); // Wednesday, 2026-W41
});
afterAll(() => vi.useRealTimers());

beforeEach(() => {
  store = createDemoStore(undefined, { team: false });
  apiClient.defaults.adapter = createDemoAdapter(store, { latency: 0 });
  as("member");
});

const THIS = "2026-W41";
const line = (task, extra = {}) => ({
  task,
  taskType: "development",
  text: "Worked on it",
  hours: 2,
  ...extra,
});
const tasksOf = (name) => store.tasks.find((t) => t.name === name);

describe("posting a day (R5)", () => {
  it("is on a frozen Wednesday", () => {
    expect(currentWeekKey()).toBe(THIS);
  });

  it("the week's first update creates the Draft; a new task appears in the picker", async () => {
    as("manager");
    expect((await reportService.getMyWeek(THIS)).report).toBeNull();
    const scheduler = tasksOf("Scheduler prototype")._id;
    const clientA = store.projects.find((p) => p.name === "Client A")._id;
    const view = await reportService.putDay(THIS, "mon", {
      lines: [
        line(scheduler, { hours: 3 }),
        {
          newTask: { name: "Checkout review", project: clientA },
          taskType: "review",
          text: "Reviewed the checkout",
          hours: 1.5,
        },
      ],
      blockers: [{ text: "Waiting on the design" }],
      openToTeam: false,
    });
    expect(view.report.status).toBe("draft");
    expect(view.dayStates.mon).toBe("posted");
    const monday = view.report.days[0];
    expect(monday.hours).toBe(4.5);
    expect(monday.lines.map((l) => l.task.project.name)).toEqual([
      "R&D",
      "Client A",
    ]);
    expect(view.report.tasks.map((t) => t.task.name)).toEqual([
      "Scheduler prototype",
      "Checkout review",
    ]);
    const picker = await taskService.listTasks();
    expect(picker.items.map((t) => t.name)).toContain("Checkout review");
  });

  it("editing keeps a blocker's identity, so its resolution survives", async () => {
    const report = store.reports.find(
      (r) => r.author === PERSPECTIVES.member && r.weekKey === THIS,
    );
    const monday = report.days.find((d) => d.weekday === "mon");
    const blocker = monday.blockers[0];
    await reportService.setResolution(report._id, blocker._id);
    const body = {
      lines: monday.lines.map((l) => ({
        _id: l._id,
        task: l.taskId,
        taskType: l.taskType,
        text: `${l.text} (edited)`,
        hours: l.hours,
      })),
      blockers: [{ _id: blocker._id, text: blocker.text }],
      openToTeam: true,
    };
    const view = await reportService.putDay(THIS, "mon", body);
    const day = view.report.days.find((d) => d.weekday === "mon");
    expect(day.blockers[0]._id).toBe(blocker._id);
    expect(day.blockers[0].resolvedAt).not.toBeNull();
    expect(day.lines.map((l) => l._id)).toEqual(monday.lines.map((l) => l._id));
    expect(day.editedAt).not.toBeNull();
    // Dropping the blocker prunes its resolution.
    await reportService.putDay(THIS, "mon", { ...body, blockers: [] });
    expect(report.blockerResolutions).toEqual([]);
  });

  it("refuses a day that hasn't happened, a holiday and a frozen week", async () => {
    const checkout = tasksOf("Checkout redesign")._id;
    const body = { lines: [line(checkout)], blockers: [], openToTeam: false };
    expect(await reasonOf(reportService.putDay(THIS, "thu", body))).toBe(
      "future",
    );
    store.holidays.push({
      _id: store.nextId("0d"),
      date: "2026-10-06",
      name: "Test holiday",
      createdBy: PERSPECTIVES.admin,
    });
    expect(await reasonOf(reportService.putDay(THIS, "tue", body))).toBe(
      "holiday",
    );
    expect(await code(reportService.putDay("2026-W42", "mon", body))).toBe(
      "WEEK_OUT_OF_RANGE",
    );
    as("manager");
    const scheduler = tasksOf("Scheduler prototype")._id;
    const error = await reportService
      .putDay(addWeeks(THIS, -1), "mon", {
        ...body,
        lines: [line(scheduler)],
      })
      .catch((e) => e);
    expect(error.code).toBe("REPORT_STATE_CHANGED");
    expect(error.details.status).toBe("submitted");
  });

  it("refuses someone else's task, a done task new to the week, and a bad line", async () => {
    const body = (lines) => ({ lines, blockers: [], openToTeam: false });
    const scheduler = tasksOf("Scheduler prototype")._id; // Nadia's
    expect(
      await code(reportService.putDay(THIS, "mon", body([line(scheduler)]))),
    ).toBe("TASK_NOT_FOUND");
    const done = tasksOf("Login timeout")._id;
    expect(
      await code(reportService.putDay(THIS, "mon", body([line(done)]))),
    ).toBe("TASK_NOT_FOUND");
    const error = await reportService
      .putDay(
        THIS,
        "mon",
        body([line(tasksOf("Checkout redesign")._id, { hours: 1.3 })]),
      )
      .catch((e) => e);
    expect(error.code).toBe("VALIDATION_FAILED");
    expect(error.fields["lines.0.hours"]).toBeTruthy();
  });
});

describe("what This week reads beside the week", () => {
  it("holidays mark the strip and come back from HD1", async () => {
    store.holidays.push({
      _id: store.nextId("0d"),
      date: "2026-10-06",
      name: "Test holiday",
      createdBy: PERSPECTIVES.admin,
    });
    as("manager");
    const view = await reportService.getMyWeek(THIS);
    expect(view.dayStates.tue).toBe("holiday");
    expect(view.expectedDays).not.toContain("tue");
    const { items } = await holidayService.listHolidays({
      from: "2026-01-01",
      to: "2026-12-31",
    });
    expect(items.map((h) => h.name)).toEqual(["Test holiday"]);
  });

  it("leave: on for today onwards, listed by U10, and off again", async () => {
    const me = await userService.setLeave(PERSPECTIVES.member, true);
    expect(me.onLeave).toBe(true);
    const { items } = await userService.listOnLeave();
    expect(items.map((u) => u.name)).toEqual(["Imali J."]);
    as("manager");
    const view = await userService.getUserWeek(PERSPECTIVES.member, THIS);
    expect(view.dayStates.wed).toBe("leave");
    expect(view.dayStates.mon).toBe("posted");
    as("member");
    await userService.setLeave(PERSPECTIVES.member, false);
    expect((await userService.listOnLeave()).items).toEqual([]);
  });

  it("a member can't put someone else on leave", async () => {
    expect(await code(userService.setLeave(PERSPECTIVES.manager, true))).toBe(
      "FORBIDDEN",
    );
  });

  it("projects: progress on assigned projects, overdue once the plan runs out", async () => {
    const { items } = await projectService.listProjects({ mine: true });
    const rnd = items.find((p) => p.name === "R&D");
    expect(rnd.progress.overdueDays).toBeGreaterThan(0);
    expect(rnd.progress.daysLeft).toBe(0);
    const clientA = items.find((p) => p.name === "Client A");
    expect(clientA.progress.daysLeft).toBeGreaterThan(0);
    expect(clientA.progress.hoursLogged).toBeGreaterThan(0);
    expect(clientA.memberIds).toBeUndefined(); // manager-only
  });

  it("my reports, newest first, and the personal strip", async () => {
    const { items, meta } = await reportService.listMyReports({
      limit: 20,
      sort: "weekKey",
      dir: "desc",
    });
    expect(meta.total).toBe(3);
    expect(items[0].weekKey).toBe(THIS);
    expect(items[1].isNew).toBe(true); // the sent-back week has an unread reply
    const summary = await reportService.getSummary({
      weekKey: THIS,
      month: "2026-10",
    });
    expect(summary.weeksFiled).toBe(2);
    expect(summary.openBlockers).toBe(1);
    expect(summary.hoursThisMonth).toBeGreaterThan(0);
  });
});
