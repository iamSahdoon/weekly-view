import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { apiClient } from "../../services/apiClient.js";
import * as dashboardService from "../../services/dashboardService.js";
import * as holidayService from "../../services/holidayService.js";
import * as projectService from "../../services/projectService.js";
import * as userService from "../../services/userService.js";
import { createDemoAdapter } from "../demoAdapter.js";
import { createDemoStore } from "../demoStore.js";
import { PERSPECTIVES } from "../fixtures.js";

// The people, projects and holidays endpoints in the demo (api_specification.md §2.2 U1–U7,
// U9, U11–U13, §2.3 P2–P5, §2.8 HD2–HD4, D7), by the server's rules and codes. The clock is
// frozen on a Wednesday of 2026-W41.

let store;
const as = (role) => {
  store.session.userId = PERSPECTIVES[role];
};
const code = (promise) =>
  promise.then(
    () => null,
    (error) => error.code,
  );

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 7, 10, 0));
});
afterAll(() => vi.useRealTimers());
beforeEach(() => {
  store = createDemoStore(undefined, { team: false });
  apiClient.defaults.adapter = createDemoAdapter(store, { latency: 0 });
  as("admin");
});

const { member: IMALI, manager: NADIA, admin: SANDUNI } = PERSPECTIVES;

describe("U7 — every week on the team", () => {
  it("lists a row per week since they joined, up to this one, reports and WeekRows alike", async () => {
    as("manager");
    const page = await userService.listUserReports(IMALI, { limit: 100 });
    expect(page.meta.total).toBe(27); // joined 26 weeks ago, plus the current week
    expect(page.items[0].weekKey).toBe("2026-W41");
    const reports = page.items.filter((r) => r._id !== null);
    expect(reports.map((r) => r.weekKey)).toEqual([
      "2026-W41",
      "2026-W40",
      "2026-W39",
    ]);
    const empty = page.items.find((r) => r.weekKey === "2026-W38");
    expect(empty).toMatchObject({
      _id: null,
      status: "not_started",
      hours: null,
      taskCount: null,
      tasksDone: null,
      projects: [],
    });
  });

  it("derives on_leave and holiday_week for a week with no report", async () => {
    as("admin");
    await holidayService.createHoliday({ date: "2026-09-14", name: "Mon" });
    for (const date of ["2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18"])
      await holidayService.createHoliday({ date, name: date });
    const page = await userService.listUserReports(IMALI, { limit: 100 });
    expect(page.items.find((r) => r.weekKey === "2026-W38").status).toBe(
      "holiday_week",
    );
  });

  it("filters by the derived states too, and puts WeekRows last by last activity", async () => {
    as("manager");
    const notStarted = await userService.listUserReports(IMALI, {
      status: "not_started",
      limit: 100,
    });
    expect(notStarted.meta.total).toBe(24);
    expect(notStarted.items.every((r) => r._id === null)).toBe(true);
    const byActivity = await userService.listUserReports(IMALI, {
      sort: "lastActivityAt",
      dir: "desc",
      limit: 100,
    });
    // Weeks with a report and some activity first, newest first; WeekRows after them.
    const active = byActivity.items.filter((r) => r.lastActivityAt);
    expect(byActivity.items.slice(0, active.length)).toEqual(active);
    expect(active.length).toBeGreaterThan(0);
    expect(active[0].lastActivityAt >= active.at(-1).lastActivityAt).toBe(true);
    expect(
      byActivity.items.slice(active.length).every((r) => !r.lastActivityAt),
    ).toBe(true);
    expect(byActivity.items.at(-1)._id).toBeNull();
    const bounded = await userService.listUserReports(IMALI, {
      weekFrom: "2026-W39",
      weekTo: "2026-W40",
    });
    expect(bounded.items.map((r) => r.weekKey)).toEqual([
      "2026-W40",
      "2026-W39",
    ]);
  });

  it("withholds task status on a Draft for a manager, and is for managers and admins only", async () => {
    as("manager");
    const page = await userService.listUserReports(IMALI, { limit: 100 });
    expect(page.items.find((r) => r.weekKey === "2026-W41")).toMatchObject({
      status: "draft",
      tasksDone: null,
    });
    as("member");
    expect(await code(userService.listUserReports(IMALI, {}))).toBe(
      "FORBIDDEN",
    );
    as("manager");
    expect(
      await code(userService.listUserReports("0a00000000000000000000ff", {})),
    ).toBe("USER_NOT_FOUND");
  });
});

describe("U9 and U2 — the leave history", () => {
  it("records who set each period, newest first, and closes the open one", async () => {
    as("manager");
    await userService.setLeave(IMALI, true);
    as("admin");
    await userService.setLeave(IMALI, false);
    as("member");
    await userService.setLeave(IMALI, true);
    as("manager");
    const { leaveHistory, onLeave } = await userService.getUser(IMALI);
    expect(onLeave).toBe(true);
    expect(leaveHistory).toHaveLength(2);
    expect(leaveHistory[0]).toMatchObject({ to: null });
    expect(leaveHistory[0].setBy._id).toBe(IMALI);
    expect(leaveHistory[1].to).not.toBeNull();
    expect(leaveHistory[1].setBy._id).toBe(NADIA);
  });

  it("is idempotent both ways", async () => {
    await userService.setLeave(IMALI, true);
    await userService.setLeave(IMALI, true);
    await userService.setLeave(IMALI, false);
    await userService.setLeave(IMALI, false);
    expect((await userService.getUser(IMALI)).leaveHistory).toHaveLength(1);
  });

  it("is only for managers and admins to read", async () => {
    as("member");
    expect(await code(userService.getUser(NADIA))).toBe("FORBIDDEN");
  });
});

describe("the user rules (§11.2–§11.3)", () => {
  it("invites, re-issues, and refuses a taken email", async () => {
    const issued = await userService.inviteUser({
      email: "Dinesh@Example.com",
      role: "member",
    });
    expect(issued.user).toMatchObject({
      email: "dinesh@example.com",
      status: "invited",
      name: "",
    });
    expect(issued.linkUrl).toMatch(/^https:\/\/.+\/invite\//);
    expect(issued.user).not.toHaveProperty("linkUrl");
    const again = await userService.reissueInvite(issued.user._id);
    expect(again.linkUrl).toMatch(/\/invite\//);
    expect(
      await code(
        userService.inviteUser({ email: "dinesh@example.com", role: "member" }),
      ),
    ).toBe("USER_EXISTS");
    expect(await code(userService.reissueInvite(IMALI))).toBe(
      "USER_STATE_CHANGED",
    );
  });

  it("serves no link in the user lists", async () => {
    await userService.inviteUser({ email: "x@example.com", role: "member" });
    const page = await userService.listUsers({ limit: 100 });
    expect(JSON.stringify(page)).not.toMatch(/linkUrl|invite\//);
    const invited = page.items.find((u) => u.email === "x@example.com");
    expect(invited.linkExpiresAt).not.toBeNull();
  });

  it("reactivates a removed person under the same _id", async () => {
    await userService.removeUser(IMALI);
    const back = await userService.inviteUser({
      email: "imali@example.com",
      role: "manager",
    });
    expect(back.user._id).toBe(IMALI);
    expect(back.user).toMatchObject({ status: "invited", role: "manager" });
  });

  it("leaves the admin role, the owner and one's own account to the owner", async () => {
    // Sanduni is the owner and an admin; Nadia is promoted to admin to be a second one.
    await userService.changeRole(NADIA, "admin");
    store.users.find((u) => u._id === NADIA).role = "admin";
    as("manager"); // the demo's manager perspective is now an admin, not the owner
    expect(await code(userService.changeRole(IMALI, "admin"))).toBe(
      "OWNER_ONLY",
    );
    expect(await code(userService.changeRole(SANDUNI, "member"))).toBe(
      "PROTECTED_ACCOUNT",
    );
    expect(await code(userService.changeRole(NADIA, "member"))).toBe(
      "CANNOT_MODIFY_SELF",
    );
    expect(await code(userService.removeUser(SANDUNI))).toBe(
      "PROTECTED_ACCOUNT",
    );
    expect(await code(userService.changeEmail(SANDUNI, "a@example.com"))).toBe(
      "PROTECTED_ACCOUNT",
    );
    expect(await code(userService.changeEmail(NADIA, "a@example.com"))).toBe(
      "CANNOT_MODIFY_SELF",
    );
    expect(
      await code(
        userService.inviteUser({ email: "a@example.com", role: "admin" }),
      ),
    ).toBe("OWNER_ONLY");
  });

  it("lets the owner change their own email and everyone else's details", async () => {
    expect(
      (await userService.changeEmail(SANDUNI, "owner@example.com")).email,
    ).toBe("owner@example.com");
    expect(
      await code(userService.changeEmail(IMALI, "owner@example.com")),
    ).toBe("USER_EXISTS");
    expect((await userService.createResetLink(IMALI)).linkUrl).toMatch(
      /\/reset\//,
    );
    expect(await code(userService.changeEmail(IMALI, "not an email"))).toBe(
      "VALIDATION_FAILED",
    );
  });

  it("changes a role, removes a person, and refuses to act on a removed one", async () => {
    expect((await userService.changeRole(IMALI, "manager")).role).toBe(
      "manager",
    );
    const removed = await userService.removeUser(IMALI);
    expect(removed.status).toBe("removed");
    expect(await code(userService.removeUser(IMALI))).toBe(
      "USER_STATE_CHANGED",
    );
    expect(await code(userService.changeRole(IMALI, "member"))).toBe(
      "USER_STATE_CHANGED",
    );
  });

  it("passes ownership to a manager, who becomes an admin, and only the owner can", async () => {
    as("manager");
    expect(await code(userService.transferOwnership(IMALI))).toBe("FORBIDDEN");
    as("admin");
    expect(await code(userService.transferOwnership(IMALI))).toBe(
      "USER_STATE_CHANGED",
    ); // a member
    expect(await code(userService.transferOwnership(SANDUNI))).toBe(
      "CANNOT_MODIFY_SELF",
    );
    const next = await userService.transferOwnership(NADIA);
    expect(next).toMatchObject({ isOwner: true, role: "admin" });
    expect(store.users.find((u) => u._id === SANDUNI)).toMatchObject({
      isOwner: false,
      role: "admin",
    });
    expect(await code(userService.transferOwnership(IMALI))).toBe("OWNER_ONLY");
  });

  it("is admins' to write: a manager is refused", async () => {
    as("manager");
    expect(
      await code(
        userService.inviteUser({ email: "q@example.com", role: "member" }),
      ),
    ).toBe("FORBIDDEN");
    expect(await code(userService.changeRole(IMALI, "manager"))).toBe(
      "FORBIDDEN",
    );
    expect(await code(userService.removeUser(IMALI))).toBe("FORBIDDEN");
  });
});

describe("P2–P5 — projects", () => {
  const plan = { startDate: "2026-10-05", plannedDays: 10, plannedHours: 80 };

  it("creates a project with members and a plan, and refuses a name in use", async () => {
    as("manager");
    const project = await projectService.createProject({
      name: "Atlas",
      description: "New work",
      memberIds: [IMALI],
      plan,
    });
    expect(project).toMatchObject({
      name: "Atlas",
      status: "active",
      memberIds: [IMALI],
      memberCount: 1,
      taskCount: 0,
    });
    expect(project.progress).toMatchObject({
      daysUsed: 3, // Mon 5, Tue 6 and Wed 7 Oct
      daysLeft: 7,
      overdueDays: 0,
    });
    expect(await code(projectService.createProject({ name: "atlas" }))).toBe(
      "PROJECT_NAME_TAKEN",
    );
    expect(await code(projectService.createProject({ name: "  " }))).toBe(
      "VALIDATION_FAILED",
    );
    expect(
      await code(
        projectService.createProject({
          name: "Saturday",
          plan: { ...plan, startDate: "2026-10-03" },
        }),
      ),
    ).toBe("VALIDATION_FAILED");
  });

  it("keeps the old plan in the history when the plan is extended", async () => {
    as("manager");
    const client = (await projectService.listProjects({})).items.find(
      (p) => p.name === "Client A",
    );
    const extended = await projectService.setPlan(client._id, {
      startDate: client.progress.plan.startDate,
      plannedDays: 60,
      plannedHours: null,
    });
    expect(extended.progress.plan.plannedDays).toBe(60);
    expect(extended.progress.planHistory).toHaveLength(1);
    expect(extended.progress.planHistory[0]).toMatchObject({
      plannedDays: 50,
      plannedHours: 300,
    });
    expect(extended.progress.planHistory[0].changedBy.name).toBe("Nadia F.");
  });

  it("sets the first plan of a project without one, and edits people", async () => {
    as("manager");
    const bare = await projectService.createProject({ name: "Bare" });
    expect(bare.progress).toBeUndefined();
    const planned = await projectService.setPlan(bare._id, plan);
    expect(planned.progress.planHistory).toEqual([]);
    const renamed = await projectService.updateProject(bare._id, {
      name: "Bare 2",
      memberIds: [IMALI, NADIA],
    });
    expect(renamed).toMatchObject({ name: "Bare 2", memberCount: 2 });
    expect(await code(projectService.updateProject(bare._id, {}))).toBe(
      "VALIDATION_FAILED",
    );
    expect(
      await code(
        projectService.updateProject("0b00000000000000000000ff", { name: "x" }),
      ),
    ).toBe("PROJECT_NOT_FOUND");
  });

  it("deactivates a project, which leaves the default list, and is idempotent", async () => {
    as("manager");
    const rnd = (await projectService.listProjects({})).items.find(
      (p) => p.name === "R&D",
    );
    expect((await projectService.deactivateProject(rnd._id)).status).toBe(
      "inactive",
    );
    expect((await projectService.deactivateProject(rnd._id)).status).toBe(
      "inactive",
    );
    const names = (await projectService.listProjects({})).items.map(
      (p) => p.name,
    );
    expect(names).not.toContain("R&D");
    expect(
      (await projectService.listProjects({ status: "all" })).items.map(
        (p) => p.name,
      ),
    ).toContain("R&D");
  });

  it("is managers' to write: a member is refused", async () => {
    as("member");
    expect(await code(projectService.createProject({ name: "Nope" }))).toBe(
      "FORBIDDEN",
    );
  });
});

describe("HD2–HD4 — holidays", () => {
  it("adds, edits and removes one, and a holiday takes a day out of a plan", async () => {
    as("manager");
    const before = (await projectService.listProjects({})).items.find(
      (p) => p.name === "Client A",
    ).progress.daysUsed;
    as("admin");
    const holiday = await holidayService.createHoliday({
      date: "2026-10-06",
      name: "Poya",
    });
    expect(holiday.createdBy.name).toBe("Sanduni B.");
    as("manager");
    const during = (await projectService.listProjects({})).items.find(
      (p) => p.name === "Client A",
    ).progress.daysUsed;
    expect(during).toBe(before - 1);
    as("admin");
    expect(
      (await holidayService.updateHoliday(holiday._id, { name: "Poya day" }))
        .name,
    ).toBe("Poya day");
    await holidayService.deleteHoliday(holiday._id);
    as("manager");
    expect(
      (await projectService.listProjects({})).items.find(
        (p) => p.name === "Client A",
      ).progress.daysUsed,
    ).toBe(before);
  });

  it("refuses a weekend, a second holiday on a date, and a missing one", async () => {
    expect(
      await code(
        holidayService.createHoliday({ date: "2026-10-10", name: "Sat" }),
      ),
    ).toBe("VALIDATION_FAILED");
    await holidayService.createHoliday({ date: "2026-10-06", name: "A" });
    expect(
      await code(
        holidayService.createHoliday({ date: "2026-10-06", name: "B" }),
      ),
    ).toBe("HOLIDAY_EXISTS");
    const other = await holidayService.createHoliday({
      date: "2026-10-08",
      name: "C",
    });
    expect(
      await code(
        holidayService.updateHoliday(other._id, { date: "2026-10-06" }),
      ),
    ).toBe("HOLIDAY_EXISTS");
    expect(
      await code(holidayService.deleteHoliday("0d00000000000000000000ff")),
    ).toBe("HOLIDAY_NOT_FOUND");
  });

  it("is admins' to write: a manager is refused", async () => {
    as("manager");
    expect(
      await code(
        holidayService.createHoliday({ date: "2026-10-06", name: "A" }),
      ),
    ).toBe("FORBIDDEN");
  });
});

describe("D7 — the profile strip", () => {
  it("counts what was filed over the weeks that were expected, leave weeks left out", async () => {
    as("manager");
    const strip = await dashboardService.getPersonMetrics(IMALI);
    // Two filed (W40 sent back, W39 approved); W41 is a Draft; 24 earlier weeks are empty.
    expect(strip.reportsFiled).toBe(2);
    expect(strip.compliance).toBeCloseTo(2 / 27);
    expect(strip.corrections).toBe(2); // W40 sent back once, W39 once before it was approved
    expect(strip.avgHoursPerWeek).toBeGreaterThan(0);
  });

  it("returns null, not NaN, for a person with no expected week", async () => {
    as("manager");
    const invited = await (async () => {
      as("admin");
      const issued = await userService.inviteUser({
        email: "z@example.com",
        role: "member",
      });
      as("manager");
      return issued.user._id;
    })();
    expect(await dashboardService.getPersonMetrics(invited)).toEqual({
      reportsFiled: 0,
      compliance: null,
      avgHoursPerWeek: null,
      corrections: 0,
    });
  });
});
