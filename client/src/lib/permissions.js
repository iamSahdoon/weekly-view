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

const BLOCKED = (reason) => ({ allowed: false, reason });
const ALLOWED = { allowed: true, reason: null };

/**
 * The Users page's row menu, from one place (frontend_architecture.md §9.12;
 * requirments_doc.md §11.2–§11.3). `me` is the signed-in admin, `target` a U1 item.
 * Each gate is `{ allowed, reason }`; `reason` is the words a disabled item carries.
 * The server enforces the same rules and answers 403 where they disagree: admins act
 * on members and managers, only the owner on admins, nobody on the owner, no one on
 * themselves (the owner may change their own email).
 */
export function userActions(me, target) {
  const self = me?._id === target._id;
  const iAmOwner = Boolean(me?.isOwner);
  const removed = target.status === "removed";
  const active = target.status === "active";

  // Role change and removal (U5, U6).
  const roleGate = (selfReason) => {
    if (self) return BLOCKED(selfReason);
    if (target.isOwner)
      return BLOCKED("The owner can't be changed by other admins.");
    if (target.role === "admin" && !iAmOwner)
      return BLOCKED("Only the owner can change another admin's details.");
    if (removed) return BLOCKED("This person has been removed.");
    return ALLOWED;
  };

  // Email and reset link (U12, U13).
  const detailsGate = (selfReason, { needsActive }) => {
    if (self) return iAmOwner ? ALLOWED : BLOCKED(selfReason);
    if (target.isOwner)
      return BLOCKED("The owner can't be changed by other admins.");
    if (target.role === "admin" && !iAmOwner)
      return BLOCKED("Only the owner can change another admin's details.");
    if (removed || (needsActive && !active))
      return BLOCKED(
        removed
          ? "This person has been removed."
          : "Only active people have a password.",
      );
    return ALLOWED;
  };

  const canMakeOwner = (() => {
    if (!iAmOwner) return BLOCKED("Only the owner can pass ownership on.");
    if (self) return BLOCKED("You already own this.");
    if (!active || target.role === "member")
      return BLOCKED("Ownership goes to an active manager or admin.");
    return ALLOWED;
  })();

  return {
    canChangeRole: roleGate("You can't change your own role."),
    canEditEmail: detailsGate("Ask the owner to change your email.", {
      needsActive: false,
    }),
    canResetPassword: detailsGate(
      "Change your own password on the Account page.",
      {
        needsActive: true,
      },
    ),
    canRemove: roleGate("You can't remove yourself."),
    canMakeOwner,
    // Leave belongs to active people; a manager or admin may set anyone's (U9).
    canToggleLeave: active
      ? ALLOWED
      : BLOCKED("Only active people can be on leave."),
    canReissue:
      target.status === "invited"
        ? ALLOWED
        : BLOCKED("Only for invited people."),
  };
}

/**
 * The line under the email on the Account page (design §3.11, requirments_doc.md §11.3):
 * who to ask. `Me.owner` names the owner and carries the address for the `mailto:`.
 */
export function emailChangeHint(me) {
  if (me?.isOwner) return { kind: "owner" };
  const owner = me?.owner ?? null;
  return {
    kind: me?.role === "admin" ? "admin" : "other",
    ownerName: owner?.name ?? null,
    ownerEmail: owner?.email ?? null,
    mailto: owner
      ? `mailto:${owner.email}?subject=${encodeURIComponent("Email change request")}`
      : null,
  };
}
