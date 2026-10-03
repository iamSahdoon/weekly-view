import { AppError } from "../utils/appError.js";

export function notFound(req, res, next) {
  next(new AppError(404, "Not found.", "ROUTE_NOT_FOUND"));
}
