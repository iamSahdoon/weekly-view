import { z } from "zod";
import { TASK_TYPES } from "../lib/constants.js";

// The day panel's form (frontend_architecture.md §6.3, design §4.11). It mirrors R5's
// limits (api_specification.md §2.5); the end-of-week form joins this file in C5.
//
// Form values: { lines: [{ _id?, task, taskType, text, hours }], blockers: [{ _id?,
// text }], openToTeam }. `task` is { kind: "existing", id } or { kind: "new", name,
// project }; `hours` is the input's text until it parses.

const task = z.any().superRefine((value, ctx) => {
  if (!value || (value.kind === "existing" && !value.id)) {
    ctx.addIssue({ code: "custom", message: "Choose a task." });
    return;
  }
  if (value.kind === "new") {
    const name = typeof value.name === "string" ? value.name.trim() : "";
    if (name.length < 1) {
      ctx.addIssue({
        code: "custom",
        path: ["name"],
        message: "Name the new task.",
      });
    } else if (name.length > 200) {
      ctx.addIssue({
        code: "custom",
        path: ["name"],
        message: "Use 200 characters or fewer.",
      });
    }
    if (!value.project) {
      ctx.addIssue({
        code: "custom",
        path: ["project"],
        message: "Choose a project for the new task.",
      });
    }
  }
});

const hours = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .refine((v) => v.length > 0, "Enter the hours.")
  .transform(Number)
  .refine((n) => Number.isFinite(n) && n > 0, "Hours must be more than 0.")
  .refine((n) => Number.isInteger(n * 4), "Use quarter hours, like 1.25.");

const line = z.object({
  _id: z.string().optional(),
  task,
  taskType: z.enum(TASK_TYPES, { error: "Choose a type." }),
  text: z
    .string()
    .trim()
    .min(1, "Say what you did.")
    .max(500, "Use 500 characters or fewer."),
  hours,
});

// An empty blocker row is dropped, never an error (§6.3).
const blockers = z
  .array(
    z.object({
      _id: z.string().optional(),
      text: z.string().trim().max(500, "Use 500 characters or fewer."),
    }),
  )
  .transform((rows) => rows.filter((b) => b.text.length > 0))
  .pipe(z.array(z.any()).max(10, "A day holds up to 10 blockers."));

export const daySchema = z.object({
  lines: z
    .array(line)
    .min(1, "Add at least one line.")
    .max(20, "A day holds up to 20 lines."),
  blockers,
  openToTeam: z.boolean(),
});

export const blankLine = () => ({
  task: null,
  taskType: "",
  text: "",
  hours: "",
});

export const blankDay = () => ({
  lines: [blankLine()],
  blockers: [],
  openToTeam: false,
});

/** A posted Day → form values. Every line and blocker keeps its `_id` (§6.3). */
export function dayToForm(day) {
  return {
    lines: day.lines.map((l) => ({
      _id: l._id,
      task: l.task ? { kind: "existing", id: l.task._id } : null,
      taskType: l.taskType,
      text: l.text,
      hours: String(l.hours),
    })),
    blockers: day.blockers.map((b) => ({ _id: b._id, text: b.text })),
    openToTeam: day.openToTeam,
  };
}

/** Parsed form values → R5's body: `task: id` or `newTask: { name, project }`. */
export function formToDayBody(values) {
  return {
    lines: values.lines.map((l) => ({
      ...(l._id && { _id: l._id }),
      ...(l.task.kind === "new"
        ? { newTask: { name: l.task.name.trim(), project: l.task.project } }
        : { task: l.task.id }),
      taskType: l.taskType,
      text: l.text,
      hours: l.hours,
    })),
    blockers: values.blockers.map((b) => ({
      ...(b._id && { _id: b._id }),
      text: b.text,
    })),
    openToTeam: values.openToTeam,
  };
}

/**
 * R5's field paths → the form's: `lines.0.newTask.name` is `lines.0.task.name` here.
 * Returns the error with its `fields` renamed, for applyServerErrors.
 */
export function dayServerFields(error) {
  if (!error?.fields) return error;
  const fields = {};
  for (const [path, message] of Object.entries(error.fields)) {
    fields[path.replace(/^(lines\.\d+)\.newTask\b/, "$1.task")] = message;
  }
  return { ...error, fields };
}
