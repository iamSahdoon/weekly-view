import { z } from "zod";
import { isWeekKey } from "../utils/weeks.js";
import { weekdayDate } from "./holidayValidator.js";
import { objectId } from "./userValidator.js";

// P1–P5 — api_specification.md §2.3.

/** A query-string boolean: "true" or "false" (z.coerce would read "false" as true). */
export const booleanQuery = z
  .enum(["true", "false"])
  .transform((v) => v === "true");

const projectParams = z.object({ id: objectId });
const projectName = z.string().trim().min(1).max(100);
const description = z.string().trim().max(200);
const memberIds = z.array(objectId).max(500);

const planBody = z.object({
  startDate: weekdayDate,
  plannedDays: z.number().int().min(1).max(1000),
  plannedHours: z.number().positive().nullable().default(null),
});

export const listProjectsSchema = z.object({
  query: z.object({
    status: z.enum(["active", "inactive", "all"]).default("active"),
    mine: booleanQuery.default(false),
    usedInWeek: z
      .string()
      .refine(isWeekKey, "Not a week key, e.g. 2026-W38")
      .optional(),
  }),
});

export const createProjectSchema = z.object({
  body: z.object({
    name: projectName,
    description: description.default(""),
    memberIds: memberIds.default([]),
    plan: planBody.nullable().default(null),
  }),
});

export const updateProjectSchema = z.object({
  params: projectParams,
  body: z
    .object({
      name: projectName.optional(),
      description: description.optional(),
      memberIds: memberIds.optional(),
    })
    .refine((b) => Object.values(b).some((v) => v !== undefined), {
      message: "Change the name, description or people",
      path: ["name"],
    }),
});

export const planSchema = z.object({ params: projectParams, body: planBody });

export const projectIdSchema = z.object({ params: projectParams });
