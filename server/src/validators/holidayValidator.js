import { z } from "zod";
import { objectId } from "./userValidator.js";

// HD1–HD4 — api_specification.md §2.8.

const toUtcDate = (s) => new Date(`${s}T00:00:00.000Z`);

/** A calendar date "YYYY-MM-DD" (§1.8) → a Date at UTC midnight. */
export const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the form YYYY-MM-DD")
  .refine((s) => {
    const d = toUtcDate(s);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
  }, "Not a real date")
  .transform(toUtcDate);

/** A calendar date that falls on a Monday to Friday. */
export const weekdayDate = calendarDate.refine(
  (d) => d.getUTCDay() >= 1 && d.getUTCDay() <= 5,
  "Pick a Monday to Friday",
);

const holidayName = z.string().trim().min(1).max(100);
const holidayParams = z.object({ id: objectId });

export const listHolidaysSchema = z.object({
  query: z
    .object({ from: calendarDate, to: calendarDate })
    .refine((q) => q.from <= q.to, {
      message: "Must be on or after from",
      path: ["to"],
    })
    .refine(
      (q) => {
        const yearLater = new Date(q.from);
        yearLater.setUTCFullYear(yearLater.getUTCFullYear() + 1);
        return q.to <= yearLater;
      },
      { message: "At most one year after from", path: ["to"] },
    ),
});

export const createHolidaySchema = z.object({
  body: z.object({ date: weekdayDate, name: holidayName }),
});

export const updateHolidaySchema = z.object({
  params: holidayParams,
  body: z
    .object({ date: weekdayDate.optional(), name: holidayName.optional() })
    .refine((b) => b.date !== undefined || b.name !== undefined, {
      message: "Change the date or the name",
      path: ["name"],
    }),
});

export const holidayIdSchema = z.object({ params: holidayParams });
