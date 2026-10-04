import { z } from "zod";
import { REPORT_STATUSES } from "../constants/reportStatus.js";
import { TASK_STATUSES } from "../constants/taskStatus.js";
import { TASK_TYPES } from "../constants/taskTypes.js";
import { WEEKDAYS } from "../constants/weekdays.js";
import { paginationQuery } from "../utils/paginate.js";
import { isWeekKey } from "../utils/weeks.js";
import { booleanQuery } from "./projectValidator.js";
import { objectId } from "./userValidator.js";

// R1–R13, U7, U8 and N1 — api_specification.md §2.5, §2.2, §2.10.

export const weekKey = z
  .string()
  .refine(isWeekKey, "Not a week key, e.g. 2026-W38");
const weekday = z.enum(WEEKDAYS);

const commaList = (values) =>
  z
    .string()
    .transform((s) => s.split(",").map((v) => v.trim()))
    .pipe(z.array(z.enum(values)).min(1));

const weekRange = (query) =>
  !query.weekFrom || !query.weekTo || query.weekFrom <= query.weekTo;
const weekRangeIssue = {
  message: "Must be on or after weekFrom",
  path: ["weekTo"],
};

const reportParams = z.object({ id: objectId });

// ---------------------------------------------------------------- lists

export const listReportsSchema = z.object({
  query: z
    .object({
      status: commaList(REPORT_STATUSES).optional(),
      project: objectId.optional(),
      weekFrom: weekKey.optional(),
      weekTo: weekKey.optional(),
      sort: z
        .enum(["weekKey", "lastActivityAt", "submittedAt"])
        .default("weekKey"),
      dir: z.enum(["asc", "desc"]).default("desc"),
      ...paginationQuery,
    })
    .refine(weekRange, weekRangeIssue),
});

export const WEEK_STATES = Object.freeze([
  ...REPORT_STATUSES,
  "not_started",
  "on_leave",
  "holiday_week",
]);

export const userReportsSchema = z.object({
  params: z.object({ userId: objectId }),
  query: z
    .object({
      status: commaList(WEEK_STATES).optional(),
      weekFrom: weekKey.optional(),
      weekTo: weekKey.optional(),
      sort: z.enum(["weekKey", "lastActivityAt"]).default("weekKey"),
      dir: z.enum(["asc", "desc"]).default("desc"),
      ...paginationQuery,
    })
    .refine(weekRange, weekRangeIssue),
});

export const userWeekSchema = z.object({
  params: z.object({ userId: objectId, weekKey }),
});

export const summarySchema = z.object({
  query: z.object({
    weekKey,
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use the form YYYY-MM"),
  }),
});

export const myWeekSchema = z.object({ params: z.object({ weekKey }) });

export const reportIdSchema = z.object({ params: reportParams });

export const revisionSchema = z.object({
  params: reportParams.extend({
    revisionNumber: z.coerce.number().int().min(1),
  }),
});

export const updatesSchema = z.object({
  query: z.object({
    weekKey,
    weekday,
    project: objectId.optional(),
    blockersOnly: booleanQuery.default(false),
  }),
});

// ---------------------------------------------------------------- R5 — a whole day

const hours = z
  .number()
  .positive("Must be more than 0")
  .refine((h) => Number.isInteger(h * 4), "Use quarter hours, e.g. 1.25");

const line = z
  .object({
    _id: objectId.optional(),
    task: objectId.optional(),
    newTask: z
      .object({ name: z.string().trim().min(1).max(200), project: objectId })
      .optional(),
    taskType: z.enum(TASK_TYPES),
    text: z.string().trim().min(1).max(500),
    hours,
  })
  .refine((l) => (l.task === undefined) !== (l.newTask === undefined), {
    message: "Pick a task or start a new one",
    path: ["task"],
  });

const blocker = z.object({
  _id: objectId.optional(),
  text: z.string().trim().min(1).max(500),
});

export const putDaySchema = z.object({
  params: z.object({ weekKey, weekday }),
  body: z.object({
    lines: z.array(line).min(1, "Add at least one line").max(20),
    blockers: z.array(blocker).max(10).default([]),
    openToTeam: z.boolean(),
  }),
});

// ---------------------------------------------------------------- R6 — autosave

const shortText = z.string().trim().max(500);

export const autosaveSchema = z.object({
  params: reportParams,
  body: z.object({
    tasks: z
      .array(
        z.object({
          task: objectId,
          status: z.enum(TASK_STATUSES).optional(),
          note: z.string().trim().max(2000).optional(),
        }),
      )
      .max(200)
      .optional(),
    nextWeek: z.array(shortText).max(30).optional(),
    achievements: z
      .array(
        z.object({
          _id: objectId.optional(),
          text: shortText,
          isKey: z.boolean().default(false),
        }),
      )
      .max(30)
      .refine(
        (a) => a.filter((x) => x.isKey).length <= 1,
        "Flag at most one key achievement",
      )
      .optional(),
    notes: z.string().trim().max(5000).optional(),
    links: z
      .array(
        z.object({
          label: shortText.default(""),
          url: z
            .string()
            .trim()
            .max(2000)
            .url("Not a valid link")
            .refine(
              (u) => /^https?:\/\//i.test(u),
              "Use an http or https link",
            ),
        }),
      )
      .max(30)
      .optional(),
    keyBlockerId: objectId.nullable().optional(),
  }),
});

// ---------------------------------------------------------------- R7, R10, R11

export const submitSchema = z.object({
  params: reportParams,
  body: z.object({ requestApproval: z.boolean().default(false) }),
});

export const resolutionSchema = z.object({
  params: reportParams.extend({ blockerId: objectId }),
});

export const teamCommentsSchema = z.object({
  params: reportParams.extend({ weekday }),
  body: z.object({ open: z.boolean() }),
});

// ---------------------------------------------------------------- N1

export const newMarksSchema = z.object({});
