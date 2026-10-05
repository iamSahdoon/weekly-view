import { z } from "zod";
import { TASK_STATUSES, TASK_TYPES } from "../lib/constants.js";

// The two forms that write a week: the day panel (frontend_architecture.md §6.3, design
// §4.11), mirroring R5's limits, and the end-of-week form (§6.4, design §4), mirroring
// R6's (api_specification.md §2.5).
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

// ---------------------------------------------------------------- the weekly form
//
// Form values (frontend_architecture.md §6.4): { taskStates: { [taskId]: { status, note }
// }, nextWeek: [{ text }], achievements: [{ _id?, text, isKey }], notes, links: [{ label,
// url }], keyBlockerId }. The task rows themselves are not fields: they are rendered from
// `week.report.tasks`, and a status is looked up by task id (§6.2).

export const LIST_MAX = 30; // R6: nextWeek, achievements and links hold up to 30 items

const ITEM_MAX = 500;
const NOTE_MAX = 2000;
const NOTES_MAX = 5000;

const tooLong = (max) => `Use ${max} characters or fewer.`;

/** Why a link row can't be saved, or null. An empty row is never a problem. */
export function linkProblem(link) {
  const label = (link?.label ?? "").trim();
  const url = (link?.url ?? "").trim();
  if (!label && !url) return null;
  if (label.length > ITEM_MAX)
    return { path: "label", message: tooLong(ITEM_MAX) };
  if (!url) return { path: "url", message: "Enter the link." };
  if (url.length > 2000) return { path: "url", message: tooLong(2000) };
  if (!/^https?:\/\/\S+$/i.test(url) || !parsesAsUrl(url)) {
    return {
      path: "url",
      message: "Use a link that starts with http:// or https://.",
    };
  }
  return null;
}

function parsesAsUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

const item = z.object({
  text: z.string().trim().max(ITEM_MAX, tooLong(ITEM_MAX)),
});

export const weeklySchema = z.object({
  taskStates: z.record(
    z.string(),
    z.object({
      status: z.enum(TASK_STATUSES, { error: "Choose a status." }),
      note: z.string().trim().max(NOTE_MAX, tooLong(NOTE_MAX)),
    }),
  ),
  nextWeek: z.array(item).max(LIST_MAX),
  achievements: z
    .array(item.extend({ _id: z.string().optional(), isKey: z.boolean() }))
    .max(LIST_MAX),
  notes: z.string().trim().max(NOTES_MAX, tooLong(NOTES_MAX)),
  links: z
    .array(z.object({ label: z.string(), url: z.string() }))
    .max(LIST_MAX)
    .superRefine((links, ctx) => {
      links.forEach((link, i) => {
        const problem = linkProblem(link);
        if (problem) {
          ctx.addIssue({
            code: "custom",
            path: [i, problem.path],
            message: problem.message,
          });
        }
      });
    }),
  keyBlockerId: z.string().nullable(),
});

const withBlank = (rows, blank) => (rows.length > 0 ? rows : [blank()]);
export const blankItem = () => ({ text: "" });
export const blankAchievement = () => ({ text: "", isKey: false });
export const blankLink = () => ({ label: "", url: "" });

const blockersOf = (report) => report.days.flatMap((d) => d.blockers);

/**
 * A Report → the weekly form's values, once, when the form mounts (§6.2). Every list
 * opens with one blank row when it is empty, so there is somewhere to type.
 */
export function reportToForm(report) {
  const content = report.content ?? {};
  return {
    taskStates: Object.fromEntries(
      report.tasks.map((t) => [
        t.task._id,
        { status: t.status ?? "", note: t.note ?? "" },
      ]),
    ),
    nextWeek: withBlank(
      (content.nextWeek ?? []).map((text) => ({ text })),
      blankItem,
    ),
    achievements: withBlank(
      (content.achievements ?? []).map((a) => ({
        _id: a._id,
        text: a.text,
        isKey: Boolean(a.isKey),
      })),
      blankAchievement,
    ),
    notes: content.notes ?? "",
    links: withBlank(
      (content.links ?? []).map((l) => ({ label: l.label ?? "", url: l.url })),
      blankLink,
    ),
    keyBlockerId: blockersOf(report).find((b) => b.isKey)?._id ?? null,
  };
}

/**
 * The form's values → R6's body (§6.4). Empty rows are dropped, and anything that fails
 * client validation is held back — a half-typed link keeps its inline error and is not
 * sent — so an autosave never becomes a 422. Only tasks the server lists are sent, and a
 * key blocker that a day edit has since removed goes as null.
 */
export function toContentPayload(values, report) {
  const listed = new Set(report.tasks.map((t) => t.task._id));
  const tasks = Object.entries(values.taskStates ?? {})
    .filter(([id]) => listed.has(id))
    .map(([id, state]) => {
      const note = (state?.note ?? "").trim();
      return {
        task: id,
        ...(TASK_STATUSES.includes(state?.status) && { status: state.status }),
        ...(note.length <= NOTE_MAX && { note }),
      };
    });

  const texts = (rows) =>
    rows
      .map((r) => (r.text ?? "").trim())
      .filter((t) => t.length > 0 && t.length <= ITEM_MAX);

  let keyTaken = false;
  const achievements = (values.achievements ?? [])
    .map((a) => ({ ...a, text: (a.text ?? "").trim() }))
    .filter((a) => a.text.length > 0 && a.text.length <= ITEM_MAX)
    .slice(0, LIST_MAX)
    .map((a) => {
      const isKey = Boolean(a.isKey) && !keyTaken;
      keyTaken ||= isKey;
      return { ...(a._id && { _id: a._id }), text: a.text, isKey };
    });

  const links = (values.links ?? [])
    .filter((l) => (l.label ?? "").trim() || (l.url ?? "").trim())
    .filter((l) => linkProblem(l) === null)
    .slice(0, LIST_MAX)
    .map((l) => ({ label: l.label.trim(), url: l.url.trim() }));

  const notes = (values.notes ?? "").trim();
  const keyBlockerId = blockersOf(report).some(
    (b) => b._id === values.keyBlockerId,
  )
    ? values.keyBlockerId
    : null;

  return {
    tasks,
    nextWeek: texts(values.nextWeek ?? []).slice(0, LIST_MAX),
    achievements,
    ...(notes.length <= NOTES_MAX && { notes }),
    links,
    keyBlockerId,
  };
}

/**
 * R7's 422 `fields` → where they show: `tasks.<id>.status` becomes the form path
 * `taskStates.<id>.status`; `days.<weekday>` is returned as a missing day, for the week
 * summary and the rail (it is never a field error — the fix is in the day panel).
 */
export function submitServerFields(error) {
  const taskFields = {};
  const days = [];
  for (const [path, message] of Object.entries(error?.fields ?? {})) {
    const task = /^tasks\.([^.]+)\.status$/.exec(path);
    const day = /^days\.(\w+)$/.exec(path);
    if (task) taskFields[`taskStates.${task[1]}.status`] = message;
    else if (day) days.push(day[1]);
  }
  return { taskFields, days };
}
