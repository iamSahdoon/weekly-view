import { AppError } from "../utils/appError.js";

// `schema` is a z.object with any of `params`, `query`, `body`. The parsed result goes
// on req.validated — Express 5's req.query is read-only, so nothing is written back.
// Field keys are paths inside their part ("email", "days.0.lines.1.hours").
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      params: req.params ?? {},
      query: req.query ?? {},
      body: req.body ?? {},
    });
    if (!result.success) {
      const fields = {};
      for (const issue of result.error.issues) {
        const key =
          issue.path.slice(1).join(".") || String(issue.path[0] ?? "");
        fields[key] ??= issue.message;
      }
      throw new AppError(
        422,
        "Some fields need attention.",
        "VALIDATION_FAILED",
        { fields },
      );
    }
    req.validated = result.data;
    next();
  };
}
