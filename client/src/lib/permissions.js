// UX gates derived from role and authorship (project_structure.md §3.2). They decide
// what the page *offers*; the server's policies are the authority and answer 403
// when this and the server disagree.

const MANAGER_ROLES = ["manager", "admin"];

export const isManagerRole = (role) => MANAGER_ROLES.includes(role);

export const isAuthorOf = (viewer, report) =>
  Boolean(viewer && report && viewer._id === report.author?._id);

/** R10: the author, or a manager or admin, at every status. */
export const canResolveBlocker = (viewer, report) =>
  isAuthorOf(viewer, report) || isManagerRole(viewer?.role);

/** R11: the same people. */
export const canToggleTeamComments = canResolveBlocker;

/**
 * Week threads have no server flag (frontend_architecture.md §14.2 G1), so the
 * client derives them: a manager or admin who isn't the author starts a thread on a
 * report that isn't a Draft; the author or a manager or admin replies.
 */
export function weekThreadAccess(viewer, report) {
  const author = isAuthorOf(viewer, report);
  const manager = isManagerRole(viewer?.role);
  return {
    canStart: manager && !author && report.status !== "draft",
    canReply: (author || manager) && report.weekComments != null,
  };
}

/** The top bar's `Edit report` (design §3.4). */
export const canEditReport = (viewer, report) =>
  isAuthorOf(viewer, report) &&
  ["draft", "needs_correction"].includes(report.status);
