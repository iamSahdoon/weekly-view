import { describe, expect, it } from "vitest";
import {
  blankDay,
  dayServerFields,
  dayToForm,
  daySchema,
  formToDayBody,
} from "../reportSchema.js";

// The day panel's form (frontend_architecture.md §6.3): what it sends to R5, and what
// it refuses before sending.

const posted = {
  weekday: "tue",
  lines: [
    {
      _id: "l1",
      task: { _id: "t1", name: "Checkout", project: { _id: "p1" } },
      taskType: "development",
      text: "Wired payments",
      hours: 3,
    },
  ],
  blockers: [{ _id: "b1", text: "Waiting on keys", isKey: true }],
  openToTeam: true,
};

const issues = (values) => {
  const result = daySchema.safeParse(values);
  return result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((i) => [i.path.join("."), i.message]),
      );
};

describe("the day form", () => {
  it("round-trips every line and blocker id, so a blocker keeps its resolution", () => {
    const values = dayToForm(posted);
    values.blockers.push({ text: "" }, { text: "A new one" });
    const body = formToDayBody(daySchema.parse(values));
    expect(body).toEqual({
      lines: [
        {
          _id: "l1",
          task: "t1",
          taskType: "development",
          text: "Wired payments",
          hours: 3,
        },
      ],
      // The empty row is dropped, never an error.
      blockers: [{ _id: "b1", text: "Waiting on keys" }, { text: "A new one" }],
      openToTeam: true,
    });
  });

  it("a new task becomes `newTask: { name, project }`", () => {
    const values = blankDay();
    values.lines[0] = {
      task: { kind: "new", name: "  Login timeout ", project: "p2" },
      taskType: "testing",
      text: "Regression tests",
      hours: "2.5",
    };
    const body = formToDayBody(daySchema.parse(values));
    expect(body.lines[0]).toEqual({
      newTask: { name: "Login timeout", project: "p2" },
      taskType: "testing",
      text: "Regression tests",
      hours: 2.5,
    });
  });

  it("a blank line names every missing field", () => {
    expect(issues(blankDay())).toEqual({
      "lines.0.task": "Choose a task.",
      "lines.0.taskType": "Choose a type.",
      "lines.0.text": "Say what you did.",
      "lines.0.hours": "Enter the hours.",
    });
  });

  it("hours are more than zero, in quarter hours, with no maximum", () => {
    const line = (hours) => ({
      lines: [
        {
          task: { kind: "existing", id: "t1" },
          taskType: "review",
          text: "x",
          hours,
        },
      ],
      blockers: [],
      openToTeam: false,
    });
    expect(issues(line("0"))["lines.0.hours"]).toBe(
      "Hours must be more than 0.",
    );
    expect(issues(line("1.3"))["lines.0.hours"]).toBe(
      "Use quarter hours, like 1.25.",
    );
    expect(issues(line("26.75"))).toEqual({});
  });

  it("a new task needs a name and a project", () => {
    const values = blankDay();
    values.lines[0] = {
      task: { kind: "new", name: "", project: "" },
      taskType: "other",
      text: "x",
      hours: "1",
    };
    expect(issues(values)).toEqual({
      "lines.0.task.name": "Name the new task.",
      "lines.0.task.project": "Choose a project for the new task.",
    });
  });

  it("maps R5's newTask paths onto the form's task field", () => {
    const error = {
      code: "VALIDATION_FAILED",
      fields: { "lines.1.newTask.name": "Too long", "lines.0.text": "Empty" },
    };
    expect(dayServerFields(error).fields).toEqual({
      "lines.1.task.name": "Too long",
      "lines.0.text": "Empty",
    });
  });
});
