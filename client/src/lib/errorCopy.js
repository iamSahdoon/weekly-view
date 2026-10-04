// One plain-language message per API error code (frontend_architecture.md §5.8),
// so the wording exists once. The server's `message` is safe to show, but the
// client renders its own copy keyed on `code` (api_specification.md §1.5).

export const ERROR_COPY = Object.freeze({
  VALIDATION_FAILED: "Some of this needs another look.",
  UNAUTHENTICATED: "Your session expired. Sign in to keep working.",
  INVALID_CREDENTIALS: "That email and password don't match.",
  FORBIDDEN: "You don't have access to do that.",
  SIGNUP_CLOSED: "This team is invite-only.",
  CANNOT_MODIFY_SELF: "You can't do that to your own account.",
  PROTECTED_ACCOUNT: "Only the owner can change the owner's account.",
  OWNER_ONLY: "Only the owner can do that.",
  REPORT_FORBIDDEN: "This week isn't yours to change.",
  SELF_REVIEW_FORBIDDEN: "You can't review your own report.",
  COMMENT_NOT_ALLOWED: "You can't comment here.",
  EDIT_WINDOW_CLOSED: "The 10 minutes to change this have passed.",
  LINK_INVALID: "This link has expired or has already been used.",
  USER_NOT_FOUND: "That no longer exists.",
  PROJECT_NOT_FOUND: "That no longer exists.",
  TASK_NOT_FOUND: "That no longer exists.",
  REPORT_NOT_FOUND: "That no longer exists.",
  REVISION_NOT_FOUND: "That no longer exists.",
  THREAD_NOT_FOUND: "That no longer exists.",
  BLOCKER_NOT_FOUND: "That no longer exists.",
  HOLIDAY_NOT_FOUND: "That no longer exists.",
  ROUTE_NOT_FOUND: "That no longer exists.",
  USER_EXISTS: "Someone on the team already uses that email.",
  USER_STATE_CHANGED: "This account has changed. Reload the list.",
  PROJECT_NAME_TAKEN: "A project already has that name.",
  HOLIDAY_EXISTS: "There's already a holiday on that date.",
  COMMENT_HAS_REPLIES: "A comment with replies can't be deleted.",
  REPORT_STATE_CHANGED: "This report changed while you were working.",
  WEEK_OUT_OF_RANGE: "That week isn't open for updates.",
  DAY_NOT_EXPECTED: "That day doesn't need an update.",
  PROJECT_INACTIVE: "That project is no longer active.",
  CURRENT_PASSWORD_INCORRECT: "That isn't your current password.",
  INTERNAL_ERROR: "Something went wrong on the server.",
  NETWORK_ERROR: "Couldn't reach the server.",
  TIMEOUT: "Couldn't reach the server.",
});

export function errorCopy(errorOrCode) {
  const code =
    typeof errorOrCode === "string" ? errorOrCode : errorOrCode?.code;
  return ERROR_COPY[code] ?? ERROR_COPY.INTERNAL_ERROR;
}
