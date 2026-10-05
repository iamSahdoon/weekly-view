import { describe, expect, it } from "vitest";
import { submitChecklist } from "../submitChecklist.js";

// The submit checklist (design §4.2, §4.10): the same two rules and the same words as
// the server's submitRules, computed from dayStates and the form's statuses.

const task = (id, status = null) => ({
  task: { _id: id, name: id, project: null },
  hours: 2,
  status,
  note: "",
});

const week = (dayStates, tasks) => ({
  expectedDays: Object.keys(dayStates).filter(
    (d) => !["holiday", "leave", "not_on_team"].includes(dayStates[d]),
  ),
  dayStates,
  report: { tasks },
});

const allPosted = {
  mon: "posted",
  tue: "posted",
  wed: "holiday",
  thu: "posted",
  fri: "posted",
};

describe("submitChecklist", () => {
  it("is met when every expected day is posted and every task has a status", () => {
    const result = submitChecklist(week(allPosted, [task("t1"), task("t2")]), {
      t1: { status: "done" },
      t2: { status: "carried_over" },
    });
    expect(result.ok).toBe(true);
    expect(result.reason).toBeNull();
    expect(result.items.map((i) => i.met)).toEqual([true, true]);
  });

  it("names the first missing day — a future or today's day counts as missing", () => {
    const result = submitChecklist(
      week({ ...allPosted, thu: "today", fri: "future" }, [task("t1")]),
      { t1: { status: "done" } },
    );
    expect(result.ok).toBe(false);
    expect(result.missingDays).toEqual(["thu", "fri"]);
    expect(result.reason).toBe("Thursday has no update.");
    expect(result.items[0]).toMatchObject({
      label: "Every working day has an update",
      met: false,
    });
  });

  it("holidays and leave are never needed", () => {
    const result = submitChecklist(
      week({ ...allPosted, mon: "leave" }, [task("t1", "done")]),
    );
    expect(result.ok).toBe(true);
  });

  it("counts tasks without a status, with the server's words", () => {
    const one = submitChecklist(week(allPosted, [task("t1"), task("t2")]), {
      t1: { status: "in_progress" },
      t2: { status: "" },
    });
    expect(one.unsetTasks).toEqual(["t2"]);
    expect(one.reason).toBe("One task has no status.");
    const two = submitChecklist(week(allPosted, [task("t1"), task("t2")]), {});
    expect(two.reason).toBe("2 tasks have no status.");
  });

  it("follows the form, not the server: met the moment the last status is chosen", () => {
    const view = week(allPosted, [task("t1")]);
    expect(submitChecklist(view, { t1: { status: "" } }).ok).toBe(false);
    expect(submitChecklist(view, { t1: { status: "done" } }).ok).toBe(true);
  });

  it("a task a refetch added, with no form entry yet, falls back to the server's status", () => {
    const view = week(allPosted, [
      task("t1"),
      task("t2", "in_progress"),
      task("t3"),
    ]);
    const result = submitChecklist(view, { t1: { status: "done" } });
    expect(result.unsetTasks).toEqual(["t3"]);
  });
});
