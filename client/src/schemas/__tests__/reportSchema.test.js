import { describe, expect, it } from "vitest";
import {
  blankDay,
  dayServerFields,
  dayToForm,
  daySchema,
  formToDayBody,
  linkProblem,
  reportToForm,
  submitServerFields,
  toContentPayload,
  weeklySchema,
} from "../reportSchema.js";

// The two forms that write a week (frontend_architecture.md §6.3, §6.4): what each
// sends to R5 or R6, and what it refuses or holds back before sending.

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

// ---------------------------------------------------------------- the weekly form

const report = {
  tasks: [
    {
      task: { _id: "t1", name: "Checkout", project: null },
      hours: 5,
      status: "in_progress",
      note: "Payments wired",
    },
    {
      task: { _id: "t2", name: "Login", project: null },
      hours: 2,
      status: null,
      note: null,
    },
  ],
  days: [
    {
      weekday: "tue",
      blockers: [
        { _id: "b1", text: "Keys", isKey: true },
        { _id: "b2", text: "VPN", isKey: false },
      ],
    },
  ],
  content: {
    nextWeek: [],
    achievements: [{ _id: "a1", text: "Shipped", isKey: true }],
    notes: "",
    links: [],
  },
};

const weeklyIssues = (values) => {
  const result = weeklySchema.safeParse(values);
  return result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((i) => [i.path.join("."), i.message]),
      );
};

describe("the weekly form", () => {
  it("opens from the report: statuses by task id, no default status, the key blocker", () => {
    const values = reportToForm(report);
    expect(values.taskStates).toEqual({
      t1: { status: "in_progress", note: "Payments wired" },
      t2: { status: "", note: "" },
    });
    expect(values.keyBlockerId).toBe("b1");
    expect(values.achievements).toEqual([
      { _id: "a1", text: "Shipped", isKey: true },
    ]);
    // Empty lists open with one blank row to type in.
    expect(values.nextWeek).toEqual([{ text: "" }]);
    expect(values.links).toEqual([{ label: "", url: "" }]);
  });

  it("sends the whole content, dropping empty rows", () => {
    const values = reportToForm(report);
    values.nextWeek = [{ text: "  Shipping  " }, { text: "" }];
    values.notes = "  A note ";
    expect(toContentPayload(values, report)).toEqual({
      tasks: [
        { task: "t1", status: "in_progress", note: "Payments wired" },
        { task: "t2", note: "" },
      ],
      nextWeek: ["Shipping"],
      achievements: [{ _id: "a1", text: "Shipped", isKey: true }],
      notes: "A note",
      links: [],
      keyBlockerId: "b1",
    });
  });

  it("holds back a half-typed link, so an autosave is never a 422", () => {
    const values = reportToForm(report);
    values.links = [
      { label: "Spec", url: "https://example.com/spec" },
      { label: "Draft", url: "https://exa" },
      { label: "Half", url: "example.com" },
      { label: "No link", url: "" },
    ];
    expect(toContentPayload(values, report).links).toEqual([
      { label: "Spec", url: "https://example.com/spec" },
      { label: "Draft", url: "https://exa" },
    ]);
    expect(linkProblem({ label: "Half", url: "example.com" })?.message).toBe(
      "Use a link that starts with http:// or https://.",
    );
    expect(linkProblem({ label: "No link", url: "" })?.message).toBe(
      "Enter the link.",
    );
    expect(linkProblem({ label: "", url: "" })).toBeNull();
  });

  it("sends a key blocker that a day edit removed as null, and one key achievement at most", () => {
    const values = reportToForm(report);
    values.keyBlockerId = "gone";
    values.achievements = [
      { text: "One", isKey: true },
      { text: "Two", isKey: true },
    ];
    const body = toContentPayload(values, report);
    expect(body.keyBlockerId).toBeNull();
    expect(body.achievements.map((a) => a.isKey)).toEqual([true, false]);
  });

  it("sends only tasks the server lists, and only real statuses", () => {
    const values = reportToForm(report);
    values.taskStates.t9 = { status: "done", note: "" };
    values.taskStates.t2 = { status: "", note: "x".repeat(2001) };
    const tasks = toContentPayload(values, report).tasks;
    expect(tasks.map((t) => t.task)).toEqual(["t1", "t2"]);
    expect(tasks[1]).toEqual({ task: "t2" }); // too-long note held back
  });

  it("validates a task's status with the design's words; optional fields never block", () => {
    const values = reportToForm(report);
    values.links = [{ label: "Half", url: "example.com" }];
    expect(weeklyIssues(values)).toEqual({
      "taskStates.t2.status": "Choose a status.",
      "links.0.url": "Use a link that starts with http:// or https://.",
    });
  });

  it("maps R7's 422 onto the form: task statuses as fields, days as missing days", () => {
    expect(
      submitServerFields({
        fields: {
          "days.thu": "Thursday has no update.",
          "tasks.t2.status": "Choose a status.",
        },
      }),
    ).toEqual({
      taskFields: { "taskStates.t2.status": "Choose a status." },
      days: ["thu"],
    });
  });
});
