import { env } from "../config/env.js";
import { AppError } from "../utils/appError.js";

// Duplicate-key errors on these unique indexes become their API error
// (api_specification.md §1.9). Any other E11000 is a bug and stays a 500.
const DUPLICATE_KEYS = {
  "users.isOwner": () =>
    new AppError(403, "Sign-up is closed.", "SIGNUP_CLOSED"),
  "users.email": () =>
    new AppError(409, "Someone already uses that email.", "USER_EXISTS"),
  "holidays.date": () =>
    new AppError(
      409,
      "There is already a holiday on that date.",
      "HOLIDAY_EXISTS",
    ),
  "projects.name": () =>
    new AppError(
      409,
      "A project with that name already exists.",
      "PROJECT_NAME_TAKEN",
    ),
};

function fromDuplicateKey(err) {
  if (err?.code !== 11000) return null;
  const collection = /collection: [^.\s]+\.(\S+)/.exec(err.message ?? "")?.[1];
  const keys = Object.keys(err.keyPattern ?? {});
  const make = keys.length === 1 && DUPLICATE_KEYS[`${collection}.${keys[0]}`];
  return make ? make() : null;
}

function toAppError(err) {
  if (err instanceof AppError) return err;
  const duplicate = fromDuplicateKey(err);
  if (duplicate) return duplicate;
  // express.json() on a body that isn't JSON.
  if (err?.type === "entity.parse.failed") {
    return new AppError(
      422,
      "The request body isn't valid JSON.",
      "VALIDATION_FAILED",
      { fields: {} },
    );
  }
  return null;
}

// Registered last; the only place an error response is formatted.
// eslint-disable-next-line no-unused-vars -- Express recognises error handlers by arity
export function errorHandler(err, req, res, next) {
  const known = toAppError(err);
  const appError =
    known ?? new AppError(500, "Something went wrong.", "INTERNAL_ERROR");
  if (!known && env.NODE_ENV === "development") console.error(err.stack ?? err);

  res.status(appError.status).json({
    success: false,
    data: null,
    message: appError.message,
    error: { code: appError.code, ...appError.extra },
  });
}
