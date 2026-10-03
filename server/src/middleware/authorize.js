import { ROLES } from "../constants/roles.js";
import { AppError } from "../utils/appError.js";

// The hierarchy: authorize("manager") admits managers and admins. Runs after authenticate.
export function authorize(minimumRole) {
  const minimum = ROLES.indexOf(minimumRole);
  if (minimum === -1) throw new Error(`Unknown role: ${minimumRole}`);
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError(
        401,
        "Your session has ended. Sign in again.",
        "UNAUTHENTICATED",
      );
    }
    if (ROLES.indexOf(req.user.role) < minimum) {
      throw new AppError(403, "You don't have access to this.", "FORBIDDEN");
    }
    next();
  };
}
