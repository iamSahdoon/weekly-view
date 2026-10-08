// The People page's request (design §3.15, frontend_architecture.md §9.10), framework-free
// so the rule is tested on its own.

import { isObjectId } from "./routeParams.js";

/**
 * The API params for U1 from `useUrlFilters`' output. The search override: while `q` is
 * non-empty the request carries no `status`, so a search reaches every status; `All`
 * never goes to the API either (omitted means all).
 */
export function peopleParams(apiParams, filters) {
  const params = { ...apiParams };
  if (filters.q || filters.status === "all") delete params.status;
  // A hand-edited `project` that isn't an id never reaches the API.
  if (!isObjectId(filters.project)) delete params.project;
  return params;
}

/**
 * Whether a --tint note should say "Showing matches in all statuses.": a search is on,
 * the status filter would have hidden something, and the response has such a row.
 */
export function showsHiddenStatuses(filters, items) {
  return (
    Boolean(filters.q) &&
    filters.status !== "all" &&
    items.some((user) => user.status !== filters.status)
  );
}
