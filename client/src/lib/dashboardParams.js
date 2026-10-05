import { REPORT_STATUSES, WEEK_STATES } from "./constants.js";
import { isObjectId } from "./routeParams.js";
import {
  enumParam,
  limitParam,
  listParam,
  pageParam,
  textParam,
} from "./urlParams.js";

// The team dashboard's URL state (frontend_architecture.md §9.8), declared once. `week` is
// useWeekParam's. Page-level filters are `person` and `project`; `status`, `page`, `limit`,
// `sort` and `dir` belong to the team table; `trendWeeks` and `trendPerson` to the trend;
// `unit` to the projects table. Each block takes only what it owns.

export const TEAM_SORTS = ["name", "status", "lastActivityAt"];
export const TREND_WINDOWS = [4, 8, 12];

export const DASHBOARD_SPEC = {
  person: listParam(),
  project: textParam(),
  status: listParam([...WEEK_STATES, ...REPORT_STATUSES]),
  page: pageParam(),
  limit: limitParam(),
  sort: enumParam(TEAM_SORTS, "name"),
  dir: enumParam(["asc", "desc"], "asc"),
  trendWeeks: enumParam(TREND_WINDOWS.map(String), "8"),
  trendPerson: textParam(),
  unit: enumParam(["days", "hours"], "days"),
};

const joined = (list) => (list.length ? list.join(",") : undefined);
const idOrNothing = (value) => (isObjectId(value) ? value : undefined);

/**
 * The API params of each block, from the parsed URL (`filters`) and the week. A param with
 * no value is left out, so two equal views share a query key. `status` is in `team` only.
 */
export function dashboardParams(filters, weekKey) {
  const shared = {
    person: joined(filters.person.filter(isObjectId)),
    project: idOrNothing(filters.project),
  };
  const withShared = (base) => ({ ...base, ...shared });
  const clean = (params) =>
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null));
  return {
    summary: clean(withShared({ weekKey })),
    team: clean(
      withShared({
        weekKey,
        status: joined(filters.status),
        page: filters.page,
        limit: filters.limit,
        sort: filters.sort,
        dir: filters.dir,
      }),
    ),
    projects: { weekKey },
    trend: clean(
      withShared({
        endWeek: weekKey,
        weeks: Number(filters.trendWeeks),
        trendPerson: idOrNothing(filters.trendPerson),
      }),
    ),
    hours: clean(withShared({ weekKey })),
    workload: clean(withShared({ weekKey })),
  };
}

/** How many page-level filters are set — person and project, nothing else. */
export const pageFilterCount = (filters) =>
  (filters.person.length > 0 ? 1 : 0) + (isObjectId(filters.project) ? 1 : 0);

/** A person's week: your own opens at /reports, anyone else's under /people. */
export const personWeekHref = (userId, meId, weekKey) =>
  userId === meId
    ? `/reports/${weekKey}`
    : `/people/${userId}/reports/${weekKey}`;
