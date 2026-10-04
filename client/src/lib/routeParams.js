import { isWeekKey } from "./dates.js";

// Route parameters are validated before they are used (frontend_architecture.md
// §4.1): a bad value renders NotFoundPage without a request, where the server
// would have answered 422.

const OBJECT_ID = /^[0-9a-f]{24}$/i;

export const isObjectId = (value) =>
  typeof value === "string" && OBJECT_ID.test(value);

const CHECKS = {
  week: isWeekKey,
  userId: isObjectId,
  reportId: isObjectId,
  token: (value) => typeof value === "string" && value.length > 0,
};

/** True when every named param is present and well-formed. */
export function paramsAreValid(names, params) {
  return names.every((name) => CHECKS[name]?.(params[name]) ?? false);
}
