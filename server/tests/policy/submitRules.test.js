import { describe, expect, it } from "vitest";
import { checkSubmit } from "../../src/policies/submitRules.js";

// The submit rules (requirments_doc.md §2.2): every expected day posted, every task given
// a status.

describe("checkSubmit", () => {
  it("passes when every expected day is posted and every task has a status", () => {
    const result = checkSubmit({
      expectedDays: ["mon", "tue", "thu", "fri"],
      postedDays: ["fri", "mon", "tue", "thu"],
      tasks: [{ task: "t1", status: "done" }],
    });
    expect(result).toEqual({ ok: true, fields: {}, messages: [] });
  });

  it("names each missing day, in day order, and each task without a status", () => {
    const result = checkSubmit({
      expectedDays: ["mon", "tue", "wed", "thu", "fri"],
      postedDays: ["mon", "tue", "fri"],
      tasks: [
        { task: "t1", status: "in_progress" },
        { task: "t2", status: null },
        { task: "t3" },
      ],
    });
    expect(result.ok).toBe(false);
    expect(result.fields).toEqual({
      "days.wed": "Wednesday has no update.",
      "days.thu": "Thursday has no update.",
      "tasks.t2.status": "Choose a status.",
      "tasks.t3.status": "Choose a status.",
    });
    expect(result.messages).toEqual([
      "Wednesday has no update.",
      "Thursday has no update.",
      "2 tasks have no status.",
    ]);
  });

  it("a day that isn't expected (holiday, leave) needs no update", () => {
    expect(
      checkSubmit({ expectedDays: ["mon"], postedDays: ["mon"], tasks: [] }).ok,
    ).toBe(true);
    expect(
      checkSubmit({ expectedDays: [], postedDays: [], tasks: [] }).ok,
    ).toBe(true);
  });

  it("one task without a status reads in the singular", () => {
    const { messages } = checkSubmit({
      expectedDays: [],
      postedDays: [],
      tasks: [{ task: "t1", status: null }],
    });
    expect(messages).toEqual(["One task has no status."]);
  });
});
