import { z } from "zod";
import { parseCalendarDate, weekdayOf } from "../lib/dates.js";

// The plan group and the project form (design §3.9), mirroring P2–P4's limits
// (api_specification.md §2.3). Number inputs hold their text until it parses, so an
// empty box is a message, not NaN.

const startDate = z
  .string()
  .refine((v) => v.length > 0, "Pick a start date.")
  .refine((v) => {
    const date = parseCalendarDate(v);
    return date && weekdayOf(date) !== null;
  }, "Pick a Monday to Friday.");

const plannedDays = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .refine((v) => v.length > 0, "Enter the planned days.")
  .transform(Number)
  .refine(
    (n) => Number.isInteger(n) && n >= 1 && n <= 1000,
    "Use a whole number from 1 to 1000.",
  );

// Optional: empty is null.
const plannedHours = z
  .union([z.string(), z.number(), z.null()])
  .transform((v) => (v == null ? "" : String(v).trim()))
  .transform((v) => (v === "" ? null : Number(v)))
  .refine(
    (n) => n === null || (Number.isFinite(n) && n > 0),
    "Use a number above 0.",
  );

export const planSchema = z.object({ startDate, plannedDays, plannedHours });

const name = z
  .string()
  .trim()
  .min(1, "Enter a project name.")
  .max(100, "Use 100 characters or fewer.");
const description = z.string().trim().max(200, "Use 200 characters or fewer.");

// The plan is part of the project form, and is left alone while its days and hours are
// empty (a project may have no plan; the start date alone is only a default).
export const isBlankPlan = (plan) =>
  String(plan.plannedDays ?? "").trim() === "" &&
  String(plan.plannedHours ?? "").trim() === "";

export const projectSchema = z
  .object({
    name,
    description,
    memberIds: z.array(z.string()),
    plan: z.object({
      startDate: z.string(),
      plannedDays: z.union([z.string(), z.number()]),
      plannedHours: z.union([z.string(), z.number(), z.null()]),
    }),
  })
  .superRefine((values, ctx) => {
    if (isBlankPlan(values.plan)) return;
    const result = planSchema.safeParse(values.plan);
    if (result.success) return;
    for (const issue of result.error.issues) {
      ctx.addIssue({
        code: "custom",
        path: ["plan", ...issue.path],
        message: issue.message,
      });
    }
  });
