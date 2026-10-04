import { z } from "zod";
import { paginationQuery } from "../utils/paginate.js";
import { WEEK_STATES, weekKey } from "./reportValidator.js";
import { objectId } from "./userValidator.js";

// D1–D8 — api_specification.md §2.9.

// A comma list, each value checked by `item` (§1.7).
const commaList = (item) =>
  z
    .string()
    .transform((s) => s.split(",").map((v) => v.trim()))
    .pipe(z.array(item).min(1));

// The page-level filters (I10, I11): `person` is multi, `project` is one id.
const pageFilters = {
  weekKey,
  person: commaList(objectId).optional(),
  project: objectId.optional(),
};

export const summarySchema = z.object({ query: z.object(pageFilters) });

// `status` is accepted by D2 only — it filters the team table, never the headline numbers.
export const teamSchema = z.object({
  query: z.object({
    ...pageFilters,
    status: commaList(z.enum(WEEK_STATES)).optional(),
    sort: z.enum(["name", "status", "lastActivityAt"]).default("name"),
    dir: z.enum(["asc", "desc"]).default("asc"),
    ...paginationQuery,
  }),
});

export const trendSchema = z.object({
  query: z.object({
    endWeek: weekKey,
    weeks: z.enum(["4", "8", "12"]).transform(Number).default(8),
    trendPerson: objectId.optional(),
    person: pageFilters.person,
    project: pageFilters.project,
  }),
});

export const weekScopedSchema = summarySchema; // D4, D5: weekKey + person + project

export const activitySchema = z.object({});

export const personMetricsSchema = z.object({
  params: z.object({ userId: objectId }),
});

export const projectsSchema = z.object({ query: z.object({ weekKey }) });
