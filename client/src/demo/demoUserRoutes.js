import { ROLES } from "../lib/constants.js";
import { compareWeekKeys, toCalendarDate, weekDays } from "../lib/dates.js";
import { reportRow } from "./demoDayRoutes.js";
import { fail, ok, withUser } from "./demoResponses.js";
import {
  expectedDaysOf,
  personWeekKeys,
  projectRef,
  userRef,
  weekStateOf,
} from "./demoWeekView.js";

// The demo's answers for the people endpoints (api_specification.md §2.2 U1–U7, U11–U13),
// with the server's gates and codes: who may act on whom (requirments_doc.md §11.2–§11.3),
// the owner protected, an invite that can be re-issued and a removed person reactivated.
// There is no email in the demo and no real link: the "link" is a sample URL that opens
// nothing, shown by the same modal state the real one uses.

const isManager = (user) => user.role === "manager" || user.role === "admin";
const SORTS = ["name", "joinedAt", "lastActivityAt", "reportsFiled"];
const DAY_MS = 86_400_000;
const LINK_DAYS = { invite: 7, reset: 1 };

const invalid = (fields) =>
  fail(422, "VALIDATION_FAILED", "Some fields need attention.", { fields });
const forbidden = () =>
  fail(403, "FORBIDDEN", "You don't have access to do that.");
const notFound = () =>
  fail(404, "USER_NOT_FOUND", "That person doesn't exist.");
const stateChanged = () =>
  fail(409, "USER_STATE_CHANGED", "This account has changed.");
const ownerOnly = () => fail(403, "OWNER_ONLY", "Only the owner can do this.");
const protectedAccount = () =>
  fail(403, "PROTECTED_ACCOUNT", "The owner's account is protected.");
const cannotModifySelf = () =>
  fail(403, "CANNOT_MODIFY_SELF", "You can't do this to your own account.");

const adminOnly = (handler) =>
  withUser((store, req, actor) =>
    actor.role === "admin" ? handler(store, req, actor) : forbidden(),
  );
const managerOnly = (handler) =>
  withUser((store, req, actor) =>
    isManager(actor) ? handler(store, req, actor) : forbidden(),
  );

/** A U1 item. */
export function userItem(store, user) {
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
    removedAt: user.removedAt ?? null,
    linkExpiresAt:
      user.status === "invited" ? (user.linkExpiresAt ?? null) : null,
    reportsFiled: own.filter((r) => r.revisionNumber > 0).length,
    lastActivityAt: activity.at(-1) ?? null,
    isOwner: user.isOwner,
    onLeave: user.onLeave,
    leaveSince: user.leaveFrom ?? null,
  };
}

const find = (store, id) => store.users.find((u) => u._id === id);

// ---------------------------------------------------------------- U1, U2

function listUsers(store, { query }) {
  const sort = query.sort ?? "name";
  const dir = query.dir ?? "asc";
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  if (!SORTS.includes(sort) || !["asc", "desc"].includes(dir)) {
    return invalid({ sort: "Invalid option" });
  }
  const list = (name) => (query[name] ? String(query[name]).split(",") : null);
  const roles = list("role");
  const statuses = list("status");
  const needle = String(query.q ?? "")
    .trim()
    .toLowerCase();

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
    .map((u) => userItem(store, u))
    .sort((a, b) => {
      const x = a[sort] ?? "";
      const y = b[sort] ?? "";
      const order = typeof x === "string" ? x.localeCompare(y) : x - y;
      return (dir === "asc" ? order : -order) || a._id.localeCompare(b._id);
    });
  const total = rows.length;
  return ok({
    items: rows.slice((page - 1) * limit, page * limit),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

function getUser(store, { params }) {
  const user = find(store, params.userId);
  if (!user) return notFound();
  const leaveHistory = [...(user.leaveHistory ?? [])]
    .reverse()
    .map((period) => ({
      from: period.from,
      to: period.to,
      setBy: userRef(store, period.setBy),
    }));
  return ok({ ...userItem(store, user), leaveHistory });
}

// ---------------------------------------------------------------- U7

function listUserReports(store, { params, query }, actor) {
  const user = find(store, params.userId);
  if (!user) return notFound();
  const sort = query.sort ?? "weekKey";
  const dir = query.dir ?? "desc";
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  if (
    !["weekKey", "lastActivityAt"].includes(sort) ||
    !["asc", "desc"].includes(dir)
  ) {
    return invalid({ sort: "Invalid option" });
  }
  const statuses = query.status ? String(query.status).split(",") : null;

  let rows = (user.joinedAt ? personWeekKeys(user) : []).map((weekKey) => {
    const report =
      store.reports.find(
        (r) => r.author === user._id && r.weekKey === weekKey,
      ) ?? null;
    if (report) {
      const row = reportRow(store, actor, report);
      // Task status is end-of-week content: a draft's is the author's; a sent-back
      // week's is read from the version that was sent back (I13).
      const sentBack = report.revisions.find(
        (v) => v.revisionNumber === report.revisionNumber,
      );
      const tasks =
        report.status === "draft"
          ? null
          : report.status === "needs_correction"
            ? sentBack?.content.tasks
            : report.content.tasks;
      return {
        ...row,
        tasksDone: tasks
          ? tasks.filter((t) => t.status === "done").length
          : null,
      };
    }
    const state = weekStateOf(
      store,
      null,
      weekKey,
      expectedDaysOf(store, user, weekKey),
    );
    const days = weekDays(weekKey);
    return {
      _id: null,
      weekKey,
      weekStart: toCalendarDate(days[0].date),
      weekEnd: toCalendarDate(days[4].date),
      status: state,
      hours: null,
      projects: [],
      taskCount: null,
      tasksDone: null,
      revisionNumber: 0,
      lastActivityAt: null,
      isNew: false,
    };
  });
  if (statuses) rows = rows.filter((r) => statuses.includes(r.status));
  if (query.weekFrom)
    rows = rows.filter((r) => compareWeekKeys(r.weekKey, query.weekFrom) >= 0);
  if (query.weekTo)
    rows = rows.filter((r) => compareWeekKeys(r.weekKey, query.weekTo) <= 0);

  const sign = dir === "desc" ? -1 : 1;
  rows.sort((a, b) => {
    if (sort === "lastActivityAt") {
      // Weeks with no activity (WeekRows, an untouched Draft) go last whichever way it
      // runs, newest week first among themselves.
      if (!a.lastActivityAt || !b.lastActivityAt) {
        if (a.lastActivityAt) return -1;
        if (b.lastActivityAt) return 1;
        return compareWeekKeys(b.weekKey, a.weekKey);
      }
      return a.lastActivityAt < b.lastActivityAt ? -sign : sign;
    }
    return compareWeekKeys(a.weekKey, b.weekKey) * sign;
  });
  const total = rows.length;
  return ok({
    items: rows.slice((page - 1) * limit, page * limit),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// ---------------------------------------------------------------- links

function newLink(user, purpose) {
  const days = LINK_DAYS[purpose];
  user.linkExpiresAt = new Date(Date.now() + days * DAY_MS).toISOString();
  return {
    linkUrl: `https://weeklyview.example/${purpose === "invite" ? "invite" : "reset"}/sample-${user._id.slice(-6)}`,
    expiresAt: user.linkExpiresAt,
  };
}

// ---------------------------------------------------------------- U3

function invite(store, { body }, actor) {
  const email = String(body?.email ?? "")
    .trim()
    .toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return invalid({ email: "Enter an email address like name@example.com." });
  }
  if (!ROLES.includes(body?.role)) return invalid({ role: "Invalid option" });
  // Owner decision: inviting an admin is the owner's, as promoting one is.
  if (body.role === "admin" && !actor.isOwner) return ownerOnly();
  const projectIds = [...new Set(body.projects ?? [])];
  const active = (id) =>
    store.projects.some((p) => p._id === id && p.status === "active");
  if (!projectIds.every(active)) {
    return invalid({ projects: "Pick active projects only." });
  }
  const existing = store.users.find((u) => u.email.toLowerCase() === email);
  if (existing && existing.status !== "removed") {
    return fail(409, "USER_EXISTS", "Someone already uses that email.");
  }
  const user = existing ?? {
    _id: store.nextId("0a"),
    name: "",
    email,
    isOwner: false,
    onLeave: false,
    leaveFrom: null,
    leaveHistory: [],
  };
  Object.assign(user, {
    role: body.role,
    status: "invited",
    projectIds,
    joinedAt: null,
    removedAt: null,
  });
  if (!existing) store.users.push(user);
  const link = newLink(user, "invite");
  return ok({ user: userItem(store, user), ...link }, existing ? 200 : 201);
}

function reissueInvite(store, { params }) {
  const user = find(store, params.userId);
  if (!user) return notFound();
  if (user.status !== "invited") return stateChanged();
  return ok(newLink(user, "invite"));
}

// ---------------------------------------------------------------- U5, U6 — the same gates

function roleOrRemovalGate(store, params, actor, newRole) {
  if (actor._id === params.userId) return { refusal: cannotModifySelf() };
  const target = find(store, params.userId);
  if (!target) return { refusal: notFound() };
  if (target.isOwner) return { refusal: protectedAccount() };
  if ((target.role === "admin" || newRole === "admin") && !actor.isOwner)
    return { refusal: ownerOnly() };
  return { target };
}

function changeRole(store, { params, body }, actor) {
  if (!ROLES.includes(body?.role)) return invalid({ role: "Invalid option" });
  const { target, refusal } = roleOrRemovalGate(
    store,
    params,
    actor,
    body.role,
  );
  if (refusal) return refusal;
  if (target.status === "removed") return stateChanged();
  target.role = body.role;
  return ok(userItem(store, target));
}

function removeUser(store, { params }, actor) {
  const { target, refusal } = roleOrRemovalGate(store, params, actor);
  if (refusal) return refusal;
  if (target.status === "removed") return stateChanged();
  target.status = "removed";
  target.removedAt = new Date().toISOString();
  target.onLeave = false;
  target.leaveFrom = null;
  const open = target.leaveHistory?.at(-1);
  if (open && open.to == null) open.to = target.removedAt;
  target.linkExpiresAt = null;
  return ok(userItem(store, target));
}

// ---------------------------------------------------------------- U11

function transferOwnership(store, { params }, actor) {
  if (!actor.isOwner) return ownerOnly();
  if (actor._id === params.userId) return cannotModifySelf();
  const target = find(store, params.userId);
  if (!target) return notFound();
  if (target.status !== "active" || target.role === "member")
    return stateChanged();
  actor.isOwner = false;
  target.isOwner = true;
  target.role = "admin";
  return ok(userItem(store, target));
}

// ---------------------------------------------------------------- U12, U13

function detailsGate(store, params, actor) {
  const target = find(store, params.userId);
  if (!target) return { refusal: notFound() };
  if (actor._id === params.userId) {
    return actor.isOwner ? { target } : { refusal: cannotModifySelf() };
  }
  if (target.isOwner) return { refusal: protectedAccount() };
  if (target.role === "admin" && !actor.isOwner)
    return { refusal: ownerOnly() };
  return { target };
}

function changeEmail(store, { params, body }, actor) {
  const email = String(body?.email ?? "")
    .trim()
    .toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return invalid({ email: "Enter an email address like name@example.com." });
  }
  const { target, refusal } = detailsGate(store, params, actor);
  if (refusal) return refusal;
  if (target.status === "removed") return stateChanged();
  if (
    store.users.some(
      (u) => u._id !== target._id && u.email.toLowerCase() === email,
    )
  ) {
    return fail(409, "USER_EXISTS", "Someone already uses that email.");
  }
  target.email = email;
  return ok(userItem(store, target));
}

function createResetLink(store, { params }, actor) {
  const { target, refusal } = detailsGate(store, params, actor);
  if (refusal) return refusal;
  if (target.status !== "active") return stateChanged();
  return ok(newLink(target, "reset"));
}

export const userRoutes = [
  ["get", "/users", managerOnly(listUsers)], // U1
  ["post", "/users", adminOnly(invite)], // U3
  ["get", "/users/:userId", managerOnly(getUser)], // U2
  ["get", "/users/:userId/reports", managerOnly(listUserReports)], // U7
  ["post", "/users/:userId/invite-link", adminOnly(reissueInvite)], // U4
  ["patch", "/users/:userId/role", adminOnly(changeRole)], // U5
  ["post", "/users/:userId/remove", adminOnly(removeUser)], // U6
  ["post", "/users/:userId/transfer-ownership", adminOnly(transferOwnership)], // U11
  ["patch", "/users/:userId/email", adminOnly(changeEmail)], // U12
  ["post", "/users/:userId/reset-link", adminOnly(createResetLink)], // U13
];
