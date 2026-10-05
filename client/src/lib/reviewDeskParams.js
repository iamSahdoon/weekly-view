import {
  enumParam,
  limitParam,
  listParam,
  pageParam,
  parseParams,
  toApiParams,
  weekParam,
} from "./urlParams.js";
import { ROLES } from "./constants.js";

// The review desk's URL state (frontend_architecture.md §9.6), declared once so the
// page and `useNextInQueue` read the same address the same way.

export const REVIEW_DESK_SPEC = {
  approval: enumParam(["requested", "all"], "requested"),
  person: listParam(),
  project: listParam(),
  role: listParam(ROLES),
  weekFrom: weekParam(),
  weekTo: weekParam(),
  sort: enumParam(["submittedAt", "weekKey"], "submittedAt"),
  dir: enumParam(["asc", "desc"], "asc"),
  page: pageParam(),
  limit: limitParam(),
};

/**
 * The query "Next in review desk" asks (§9.7): page 1, oldest first, with the filters
 * of the desk the reviewer came from. `deskSearch` is that desk's `location.search`;
 * without one it is the default desk.
 */
export function nextInQueueParams(deskSearch = "") {
  const filters = parseParams(
    REVIEW_DESK_SPEC,
    new URLSearchParams(deskSearch),
  );
  return toApiParams(REVIEW_DESK_SPEC, {
    ...filters,
    sort: "submittedAt",
    dir: "asc",
    page: 1,
  });
}

/** The first item of a desk page that isn't `currentId`, or null. */
export const firstOther = (items, currentId) =>
  items.find((item) => item._id !== currentId) ?? null;
