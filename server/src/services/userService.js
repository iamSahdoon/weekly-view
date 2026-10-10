import { createHash, randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { Project } from "../models/projectModel.js";
import { Report } from "../models/reportModel.js";
import { User } from "../models/userModel.js";
import { AppError } from "../utils/appError.js";
import { pageWindow, paginated } from "../utils/paginate.js";

// Invites, reset links, roles, email, removal, leave, ownership and work periods
// (project_structure.md §2.5). User rules are plain gates here, not a policy module
// (tech_stack.md §3.1).

const HOUR = 60 * 60 * 1000;
const LINK_TTL_HOURS = { invite: 7 * 24, reset: 24 };

// ---------------------------------------------------------------- errors

const userNotFound = () =>
  new AppError(404, "That person doesn't exist.", "USER_NOT_FOUND");
const cannotModifySelf = () =>
  new AppError(
    403,
    "You can't do this to your own account.",
    "CANNOT_MODIFY_SELF",
  );
const protectedAccount = () =>
  new AppError(403, "The owner's account is protected.", "PROTECTED_ACCOUNT");
const ownerOnly = () =>
  new AppError(403, "Only the owner can do this.", "OWNER_ONLY");
const stateChanged = (status) =>
  new AppError(
    409,
    "This person's account has changed. Refresh and try again.",
    "USER_STATE_CHANGED",
    { status },
  );
const userExists = () =>
  new AppError(409, "Someone already uses that email.", "USER_EXISTS");

// ---------------------------------------------------------------- link tokens

/** SHA-256 of a raw link token — deterministic, so the token is its own lookup key. */
export function hashLinkToken(raw) {
  return createHash("sha256").update(raw).digest("hex");
}

// The one path for invites, re-issues and resets (tech_stack.md §2.1). The raw token
// leaves this module only inside `linkUrl`, in the response that issues it.
function newLink(purpose) {
  const raw = randomBytes(32).toString("base64url"); // 256 bits; never stored
  const expiresAt = new Date(Date.now() + LINK_TTL_HOURS[purpose] * HOUR);
  return {
    fields: {
      linkTokenHash: hashLinkToken(raw),
      linkTokenPurpose: purpose,
      linkTokenExpiresAt: expiresAt,
    },
    linkUrl: `${env.CLIENT_URL.replace(/\/+$/, "")}/${purpose}/${raw}`,
    expiresAt,
  };
}

/** `$unset` spec for the three link fields — never null (see userModel.js). */
export const CLEAR_LINK = Object.freeze({
  linkTokenHash: "",
  linkTokenPurpose: "",
  linkTokenExpiresAt: "",
});

// ---------------------------------------------------------------- shapes (§1.10)

const openLeave = (user) => {
  const last = user.leave?.at(-1);
  return last && last.to == null ? last : null;
};

const projectRef = (p) => ({ _id: p._id, name: p.name, status: p.status });

export const userRef = (user) => ({
  _id: user._id,
  name: user.name,
  role: user.role,
  status: user.status,
  onLeave: !!openLeave(user),
});

const joinedAt = (user) => user.workPeriods?.[0]?.from ?? null;

function removedAt(user) {
  if (user.status !== "removed") return null;
  return user.workPeriods?.findLast((p) => p.to != null)?.to ?? null;
}

function toUserItem(user) {
  const leave = openLeave(user);
  const liveInvite =
    user.status === "invited" && user.linkTokenPurpose === "invite";
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    projects: (user.projects ?? []).filter(Boolean).map(projectRef),
    joinedAt: joinedAt(user),
    removedAt: removedAt(user),
    // Served while the invite is unused, past or not: the client shows "Invite expired".
    linkExpiresAt: liveInvite ? (user.linkTokenExpiresAt ?? null) : null,
    reportsFiled: user.reportsFiled ?? 0,
    lastActivityAt: user.lastActivityAt ?? null,
    isOwner: !!user.isOwner,
    onLeave: !!leave,
    leaveSince: leave?.from ?? null,
  };
}

// What a list row never carries (U1: no token or hash, raw or stored, ever).
const HIDDEN = "-passwordHash -linkTokenHash -tokenVersion";
const STAT_SORTS = new Set(["reportsFiled", "lastActivityAt"]);

/**
 * `reportsFiled` (reports submitted at least once; a draft has revisionNumber 0) and
 * `lastActivityAt` for the given people, as a Map keyed by id string — one grouped query
 * over the `{ author, weekKey }` index, not one per person.
 */
async function reportStats(authorIds) {
  if (authorIds.length === 0) return new Map();
  const rows = await Report.aggregate([
    { $match: { author: { $in: authorIds } } },
    {
      $group: {
        _id: "$author",
        filed: { $sum: { $cond: [{ $gt: ["$revisionNumber", 0] }, 1, 0] } },
        last: { $max: "$lastActivityAt" },
      },
    },
  ]);
  return new Map(rows.map((row) => [String(row._id), row]));
}

const withStats = (users, stats) =>
  users.map((user) =>
    toUserItem({
      ...user,
      reportsFiled: stats.get(String(user._id))?.filed ?? 0,
      lastActivityAt: stats.get(String(user._id))?.last ?? null,
    }),
  );

// U1 rows and every single-user read share this function, so a row is the same shape
// wherever it is served. Sorting and paging happen on the users first and the report stats
// are then read for the people on the page only (name and joinedAt sorts), or for everyone
// matched in one grouped query when the sort is by the stats themselves — never a lookup per
// person before paging. A null sorts lowest, as MongoDB orders it; ties fall to `_id`.
async function queryUserItems(match, { sort = "name", dir = "asc", window }) {
  const order = dir === "desc" ? -1 : 1;
  const populate = { path: "projects", select: "name status" };

  if (STAT_SORTS.has(sort)) {
    const everyone = await User.find(match).select("_id").lean();
    const stats = await reportStats(everyone.map((u) => u._id));
    const key = (id) => {
      const row = stats.get(String(id));
      const value = sort === "reportsFiled" ? (row?.filed ?? 0) : row?.last;
      return value == null ? -Infinity : Number(value);
    };
    const ids = everyone
      .map((u) => u._id)
      .sort(
        (a, b) =>
          (key(a) === key(b) ? 0 : key(a) < key(b) ? -order : order) ||
          String(a).localeCompare(String(b)),
      );
    const pageIds = window
      ? ids.slice(window.skip, window.skip + window.limit)
      : ids;
    const found = await User.find({ _id: { $in: pageIds } })
      .select(HIDDEN)
      .populate(populate)
      .lean();
    const byId = new Map(found.map((u) => [String(u._id), u]));
    return {
      items: withStats(
        pageIds.map((id) => byId.get(String(id))),
        stats,
      ),
      total: ids.length,
    };
  }

  const sortSpec =
    sort === "joinedAt"
      ? { "workPeriods.0.from": order, _id: 1 }
      : { name: order, _id: 1 };
  let query = User.find(match)
    .collation({ locale: "en", strength: 2 })
    .sort(sortSpec);
  if (window) query = query.skip(window.skip).limit(window.limit);
  const [users, total] = await Promise.all([
    query.select(HIDDEN).populate(populate).lean(),
    window ? User.countDocuments(match) : undefined,
  ]);
  const stats = await reportStats(users.map((u) => u._id));
  return {
    items: withStats(users, stats),
    total: total ?? users.length,
  };
}

/** A U1 item for one user, or USER_NOT_FOUND. */
export async function loadUserItem(userId) {
  const { items } = await queryUserItems(
    {
      _id: new mongoose.Types.ObjectId(String(userId)),
    },
    {},
  );
  if (!items[0]) throw userNotFound();
  return items[0];
}

/** The signed-in person's `Me`, with the owner named for the Account page (I19). */
export async function loadMe(userId) {
  const [user, owner] = await Promise.all([
    User.findById(userId).populate("projects", "name status").lean(),
    User.findOne({ isOwner: true }).select("name email").lean(),
  ]);
  if (!user) throw userNotFound();
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    projects: (user.projects ?? []).filter(Boolean).map(projectRef),
    joinedAt: joinedAt(user),
    isOwner: !!user.isOwner,
    onLeave: !!openLeave(user),
    owner: owner ? { name: owner.name, email: owner.email } : null,
  };
}

// ---------------------------------------------------------------- reads

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** U1 — People and Users. */
export async function listUsers(actor, filters) {
  const match = {};
  if (filters.q) {
    const re = new RegExp(escapeRegex(filters.q), "i");
    match.$or = [{ name: re }, { email: re }];
  }
  if (filters.role) match.role = { $in: filters.role };
  if (filters.status) match.status = { $in: filters.status };
  if (filters.project)
    match.projects = new mongoose.Types.ObjectId(filters.project);

  const { items, total } = await queryUserItems(match, {
    sort: filters.sort,
    dir: filters.dir,
    window: pageWindow(filters),
  });
  return paginated(items, { page: filters.page, limit: filters.limit, total });
}

/**
 * U2 — the profile header: a U1 item plus `leaveHistory`, every leave period newest
 * first, each with who set it (owner decision, 2026-10-05; api_specification.md §2.2).
 */
export async function getUser(actor, userId) {
  const item = await loadUserItem(userId);
  const user = await User.findById(userId)
    .select("leave")
    .populate("leave.setBy", "name role status leave")
    .lean();
  const leaveHistory = (user?.leave ?? [])
    .map((p) => ({
      from: p.from,
      to: p.to ?? null,
      setBy: p.setBy ? userRef(p.setBy) : null,
    }))
    .reverse();
  return { ...item, leaveHistory };
}

/** U10 — active people with an open leave period, by name. Bounded: the team. */
export async function listOnLeave() {
  const users = await User.find({
    status: "active",
    leave: { $elemMatch: { to: null } },
  })
    .select("name role status leave")
    .collation({ locale: "en", strength: 2 })
    .sort({ name: 1, _id: 1 })
    .lean();
  return { items: users.filter(openLeave).map(userRef) };
}

// ---------------------------------------------------------------- gates

const isSelf = (actor, userId) => String(actor.id) === String(userId);

async function loadUser(userId) {
  const user = await User.findById(userId).lean();
  if (!user) throw userNotFound();
  return user;
}

// U5 and U6 steps 1–4. `newRole` is set for a role change only.
async function loadForRoleOrRemoval(actor, userId, newRole) {
  if (isSelf(actor, userId)) throw cannotModifySelf();
  const target = await loadUser(userId);
  if (target.isOwner) throw protectedAccount();
  if ((target.role === "admin" || newRole === "admin") && !actor.isOwner)
    throw ownerOnly();
  return target;
}

// U12 and U13 steps 1–2 (requirments_doc.md §11.3).
async function loadForDetails(actor, userId) {
  const target = await loadUser(userId);
  if (isSelf(actor, userId)) {
    if (!actor.isOwner) throw cannotModifySelf();
    return target;
  }
  if (target.isOwner) throw protectedAccount();
  if (target.role === "admin" && !actor.isOwner) throw ownerOnly();
  return target;
}

async function assertActiveProjects(ids) {
  const unique = [...new Set(ids)];
  const found = await Project.countDocuments({
    _id: { $in: unique },
    status: "active",
  });
  if (found !== unique.length) {
    throw new AppError(
      422,
      "Some fields need attention.",
      "VALIDATION_FAILED",
      {
        fields: { projects: "Pick active projects only." },
      },
    );
  }
  return unique;
}

// ---------------------------------------------------------------- writes

/** U3 — invite a new person, or reactivate a removed one with the same `_id`. */
export async function invite(actor, { email, role, projects = [] }) {
  // Owner decision: inviting an admin is the owner's, as promoting one is (U5).
  if (role === "admin" && !actor.isOwner) throw ownerOnly();
  const projectIds = await assertActiveProjects(projects);
  const existing = await User.findOne({ email }).lean();
  if (existing && existing.status !== "removed") throw userExists();

  const link = newLink("invite");
  let userId;
  if (existing) {
    const updated = await User.findOneAndUpdate(
      { _id: existing._id, status: "removed" },
      {
        $set: { status: "invited", role, projects: projectIds, ...link.fields },
        $unset: { passwordHash: "" },
        $inc: { tokenVersion: 1 },
      },
      { new: true, projection: { _id: 1 } },
    ).lean();
    if (!updated) throw userExists();
    userId = updated._id;
  } else {
    // A concurrent invite to the same address loses on { email: 1 } → USER_EXISTS.
    const created = await User.create({
      email,
      role,
      projects: projectIds,
      status: "invited",
      ...link.fields,
    });
    userId = created._id;
  }
  return {
    created: !existing,
    user: await loadUserItem(userId),
    linkUrl: link.linkUrl,
    expiresAt: link.expiresAt,
  };
}

/** U4 — a fresh invite link; overwriting the hash kills the previous one. */
export async function reissueInvite(actor, userId) {
  const target = await loadUser(userId);
  if (target.status !== "invited") throw stateChanged(target.status);
  const link = newLink("invite");
  const updated = await User.updateOne(
    { _id: target._id, status: "invited" },
    { $set: link.fields },
  );
  if (updated.matchedCount === 0)
    throw stateChanged((await loadUser(userId)).status);
  return { linkUrl: link.linkUrl, expiresAt: link.expiresAt };
}

/** U5 */
export async function changeRole(actor, userId, role) {
  const target = await loadForRoleOrRemoval(actor, userId, role);
  if (target.status === "removed") throw stateChanged(target.status);
  if (target.role !== role) {
    const updated = await User.updateOne(
      { _id: target._id, status: { $ne: "removed" }, isOwner: { $ne: true } },
      { $set: { role }, $inc: { tokenVersion: 1 } },
    );
    if (updated.matchedCount === 0) throw stateChanged("removed");
  }
  return loadUserItem(target._id);
}

/** U6 — deactivate; history stays attributed to the same `_id`. */
export async function removeUser(actor, userId) {
  const target = await loadForRoleOrRemoval(actor, userId);
  if (target.status === "removed") throw stateChanged(target.status);
  const now = new Date();
  const updated = await User.updateOne(
    { _id: target._id, status: { $ne: "removed" }, isOwner: { $ne: true } },
    {
      // Closes the open work period and, by owner decision, any open leave period.
      $set: {
        status: "removed",
        "workPeriods.$[open].to": now,
        "leave.$[away].to": now,
      },
      $unset: CLEAR_LINK,
      $inc: { tokenVersion: 1 },
    },
    { arrayFilters: [{ "open.to": null }, { "away.to": null }] },
  );
  if (updated.matchedCount === 0) throw stateChanged("removed");
  return loadUserItem(target._id);
}

/** U9 — opens or closes a leave period; idempotent both ways. */
export async function setLeave(actor, userId, onLeave) {
  const self = isSelf(actor, userId);
  if (!self && actor.role === "member")
    throw new AppError(403, "You don't have access to this.", "FORBIDDEN");
  const target = await loadUser(userId);
  if (target.status !== "active") throw stateChanged(target.status);

  const now = new Date();
  if (onLeave) {
    // Opens a period only when none is open, so periods never overlap.
    await User.updateOne(
      {
        _id: target._id,
        status: "active",
        leave: { $not: { $elemMatch: { to: null } } },
      },
      { $push: { leave: { from: now, to: null, setBy: actor.id } } },
    );
  } else {
    await User.updateOne(
      { _id: target._id, leave: { $elemMatch: { to: null } } },
      { $set: { "leave.$.to": now } },
    );
  }
  return self ? loadMe(target._id) : loadUserItem(target._id);
}

/** U11 — the one transaction (database_schema.md §3.3). */
export async function transferOwnership(actor, userId) {
  if (!actor.isOwner) throw ownerOnly();
  if (isSelf(actor, userId)) throw cannotModifySelf();
  const target = await loadUser(userId);
  if (target.status !== "active" || target.role === "member")
    throw stateChanged(target.status);

  await mongoose.connection.transaction(async (session) => {
    // Re-checked inside the transaction: the actor still owns it, the target still qualifies.
    const owner = await User.findOneAndUpdate(
      { _id: actor.id, isOwner: true },
      { $unset: { isOwner: "" } },
      { session, projection: { _id: 1 } },
    );
    if (!owner) throw ownerOnly();
    const promote = target.role === "manager";
    const next = await User.findOneAndUpdate(
      { _id: target._id, status: "active", role: target.role },
      {
        $set: { isOwner: true, ...(promote && { role: "admin" }) },
        ...(promote && { $inc: { tokenVersion: 1 } }),
      },
      { session, projection: { _id: 1, status: 1 } },
    );
    if (!next) throw stateChanged((await loadUser(userId)).status);
  });
  return loadUserItem(target._id);
}

/** U12 — the person signs in again with the new address. */
export async function changeEmail(actor, userId, email) {
  const target = await loadForDetails(actor, userId);
  if (target.status === "removed") throw stateChanged(target.status);
  if (target.email === email) return loadUserItem(target._id);
  if (await User.exists({ email, _id: { $ne: target._id } }))
    throw userExists();
  // A concurrent claim of the address loses on { email: 1 } → USER_EXISTS.
  const updated = await User.updateOne(
    { _id: target._id, status: { $ne: "removed" } },
    { $set: { email }, $inc: { tokenVersion: 1 } },
  );
  if (updated.matchedCount === 0) throw stateChanged("removed");
  return loadUserItem(target._id);
}

/** U13 — a 24-hour reset link; the admin never sets or sees a password. */
export async function issueResetLink(actor, userId) {
  const target = await loadForDetails(actor, userId);
  if (target.status !== "active") throw stateChanged(target.status);
  const link = newLink("reset");
  const updated = await User.updateOne(
    { _id: target._id, status: "active" },
    { $set: link.fields },
  );
  if (updated.matchedCount === 0)
    throw stateChanged((await loadUser(userId)).status);
  return { linkUrl: link.linkUrl, expiresAt: link.expiresAt };
}
