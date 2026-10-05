import { fail, ok, withUser } from "./demoResponses.js";
import { projectRef } from "./demoWeekView.js";

// The demo's answer for the people list (api_specification.md §2.2 U1). C6 reads it for
// the person filters on the review desk; the People and Users pages (C8) read the rest.

const isManager = (user) => user.role === "manager" || user.role === "admin";
const SORTS = ["name", "joinedAt", "lastActivityAt", "reportsFiled"];

function listUsers(store, { query }, actor) {
  if (!isManager(actor)) {
    return fail(403, "FORBIDDEN", "You don't have access to do that.");
  }
  const sort = query.sort ?? "name";
  const dir = query.dir ?? "asc";
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  if (!SORTS.includes(sort) || !["asc", "desc"].includes(dir)) {
    return fail(422, "VALIDATION_FAILED", "Some fields need attention.", {
      fields: { sort: "Invalid option" },
    });
  }
  const list = (name) => (query[name] ? String(query[name]).split(",") : null);
  const roles = list("role");
  const statuses = list("status");
  const needle = String(query.q ?? "")
    .trim()
    .toLowerCase();

  const row = (user) => {
    const own = store.reports.filter((r) => r.author === user._id);
    const activity = own
      .map((r) => r.lastActivityAt)
      .filter(Boolean)
      .sort();
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      projects: user.projectIds
        .map((id) => projectRef(store, id))
        .filter(Boolean),
      joinedAt: user.joinedAt,
      removedAt: null,
      linkExpiresAt: null,
      reportsFiled: own.filter((r) => r.revisionNumber > 0).length,
      lastActivityAt: activity.at(-1) ?? null,
      isOwner: user.isOwner,
      onLeave: user.onLeave,
      leaveSince: user.leaveFrom ?? null,
    };
  };

  const rows = store.users
    .filter(
      (u) =>
        (!roles || roles.includes(u.role)) &&
        (!statuses || statuses.includes(u.status)) &&
        (!query.project || u.projectIds.includes(query.project)) &&
        (!needle ||
          u.name.toLowerCase().includes(needle) ||
          u.email.toLowerCase().includes(needle)),
    )
    .map(row)
    .sort((a, b) => {
      const x = a[sort] ?? "";
      const y = b[sort] ?? "";
      const order = typeof x === "string" ? x.localeCompare(y) : x - y;
      return dir === "asc" ? order : -order;
    });
  const total = rows.length;
  return ok({
    items: rows.slice((page - 1) * limit, page * limit),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export const userRoutes = [["get", "/users", withUser(listUsers)]]; // U1
