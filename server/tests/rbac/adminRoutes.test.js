import { beforeEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import request from "supertest";
import app from "../../src/app.js";
import { Holiday } from "../../src/models/holidayModel.js";
import { Project } from "../../src/models/projectModel.js";
import { Report } from "../../src/models/reportModel.js";
import { User } from "../../src/models/userModel.js";
import { bearer, createUser } from "../helpers/testAuth.js";
import { clearDb } from "../helpers/testDb.js";

// api_specification.md §6.6 (33–40) for the S2–S4 routes, plus U1, U2, U9, U10 and
// the holidays (HD1–HD4). S6 adds its rows to 33: D1–D8.

const api = request(app);
const PASSWORD = "correct horse battery";
const ghost = "0123456789abcdef01234567";

let owner, admin, managerA, managerB, memberX, memberY;

beforeEach(async () => {
  await clearDb();
  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  owner = await createUser({
    name: "Owner O.",
    role: "admin",
    isOwner: true,
    passwordHash,
  });
  admin = await createUser({ name: "Admin A.", role: "admin", passwordHash });
  managerA = await createUser({
    name: "Manager A.",
    role: "manager",
    passwordHash,
  });
  managerB = await createUser({
    name: "Manager B.",
    role: "manager",
    passwordHash,
  });
  memberX = await createUser({
    name: "Member X.",
    role: "member",
    passwordHash,
  });
  memberY = await createUser({
    name: "Member Y.",
    role: "member",
    passwordHash,
  });
});

const as = (user) => ({ Authorization: bearer(user) });
const fresh = (user) => User.findById(user._id).lean();

const routes = {
  U1: () => ["get", "/api/users"],
  U2: (id) => ["get", `/api/users/${id}`],
  U3: () => [
    "post",
    "/api/users",
    { email: "new@example.com", role: "member" },
  ],
  U4: (id) => ["post", `/api/users/${id}/invite-link`],
  U5: (id) => ["patch", `/api/users/${id}/role`, { role: "manager" }],
  U6: (id) => ["post", `/api/users/${id}/remove`],
  U7: (id) => ["get", `/api/users/${id}/reports`],
  U11: (id) => ["post", `/api/users/${id}/transfer-ownership`],
  U12: (id) => [
    "patch",
    `/api/users/${id}/email`,
    { email: "changed@example.com" },
  ],
  U13: (id) => ["post", `/api/users/${id}/reset-link`],
  P2: () => ["post", "/api/projects", { name: "Client A" }],
  P3: (id) => ["patch", `/api/projects/${id}`, { name: "Client B" }],
  P4: (id) => [
    "put",
    `/api/projects/${id}/plan`,
    { startDate: "2026-09-07", plannedDays: 20 },
  ],
  P5: (id) => ["post", `/api/projects/${id}/deactivate`],
  HD2: () => ["post", "/api/holidays", { date: "2026-09-08", name: "Poya" }],
  HD3: (id) => ["patch", `/api/holidays/${id}`, { name: "Renamed" }],
  HD4: (id) => ["delete", `/api/holidays/${id}`],
};

function call(route, actor, id) {
  const [method, path, body] = routes[route](id);
  const req = api[method](path).set(as(actor));
  return body ? req.send(body) : req;
}

describe("33 · wrong role → 403 FORBIDDEN", () => {
  it.each(["U3", "U4", "U5", "U6", "U11", "U12", "U13"])(
    "manager → %s",
    async (route) => {
      const res = await call(route, managerA, memberX._id);
      expect(res.status).toBe(403);
      expect(res.body.error).toEqual({ code: "FORBIDDEN" });
    },
  );

  it.each(["U1", "U2", "U3", "U5", "U6", "U7"])(
    "member → %s",
    async (route) => {
      const res = await call(route, memberX, memberY._id);
      expect(res.status).toBe(403);
      expect(res.body.error).toEqual({ code: "FORBIDDEN" });
    },
  );

  it.each(["P2", "P3", "P4", "P5"])("member → %s", async (route) => {
    const project = await Project.create({ name: "Existing" });
    const res = await call(route, memberX, project._id);
    expect(res.status).toBe(403);
    expect(res.body.error).toEqual({ code: "FORBIDDEN" });
    expect(await Project.find().lean()).toEqual([
      expect.objectContaining({
        name: "Existing",
        status: "active",
        plan: null,
      }),
    ]);
  });

  it.each(["HD2", "HD3", "HD4"])("manager and member → %s", async (route) => {
    const holiday = await Holiday.create({
      date: new Date("2026-09-09T00:00:00Z"),
      name: "Kept",
      createdBy: admin._id,
    });
    for (const actor of [managerA, memberX]) {
      const res = await call(route, actor, holiday._id);
      expect(res.status).toBe(403);
      expect(res.body.error).toEqual({ code: "FORBIDDEN" });
    }
    expect(await Holiday.find().lean()).toEqual([
      expect.objectContaining({ name: "Kept" }),
    ]);
  });

  it.each(["P2", "P3", "P4", "P5"])(
    "manager and admin → %s → 2xx",
    async (route) => {
      for (const actor of [managerA, admin]) {
        const project = await Project.create({ name: `P ${actor.name}` });
        const res = await call(route, actor, project._id);
        expect([200, 201]).toContain(res.status);
        await Project.deleteMany({});
      }
    },
  );

  it("without a token → 401", async () => {
    const res = await api.get("/api/users");
    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({ code: "UNAUTHENTICATED" });
  });
});

describe("34 · an admin on themselves → 403 CANNOT_MODIFY_SELF", () => {
  it.each(["U5", "U6", "U12"])("%s", async (route) => {
    const res = await call(route, admin, admin._id);
    expect(res.status).toBe(403);
    expect(res.body.error).toEqual({ code: "CANNOT_MODIFY_SELF" });
  });

  it("U13 on themselves", async () => {
    const res = await call("U13", admin, admin._id);
    expect(res.body.error).toEqual({ code: "CANNOT_MODIFY_SELF" });
  });

  it("the owner on their own role, removal, or transfer", async () => {
    for (const route of ["U5", "U6", "U11"]) {
      const res = await call(route, owner, owner._id);
      expect(res.status).toBe(403);
      expect(res.body.error).toEqual({ code: "CANNOT_MODIFY_SELF" });
    }
  });

  it("the owner may change their own email", async () => {
    const res = await call("U12", owner, owner._id);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("changed@example.com");
  });
});

describe("35 · the owner is protected; other admins are the owner's", () => {
  it.each(["U5", "U6", "U12", "U13"])(
    "admin → %s on the owner → PROTECTED_ACCOUNT",
    async (route) => {
      const res = await call(route, admin, owner._id);
      expect(res.status).toBe(403);
      expect(res.body.error).toEqual({ code: "PROTECTED_ACCOUNT" });
    },
  );

  it.each(["U5", "U6", "U12", "U13"])(
    "admin → %s on another admin → OWNER_ONLY",
    async (route) => {
      const other = await createUser({ role: "admin" });
      const res = await call(route, admin, other._id);
      expect(res.status).toBe(403);
      expect(res.body.error).toEqual({ code: "OWNER_ONLY" });
    },
  );

  it.each(["U5", "U6", "U12", "U13"])(
    "the owner → %s on another admin → 200",
    async (route) => {
      const res = await call(route, owner, admin._id);
      expect(res.status).toBe(200);
    },
  );

  it("a non-owner admin can't promote to admin", async () => {
    const res = await api
      .patch(`/api/users/${managerA._id}/role`)
      .set(as(admin))
      .send({ role: "admin" });
    expect(res.status).toBe(403);
    expect(res.body.error).toEqual({ code: "OWNER_ONLY" });
  });

  it("only the owner invites at role admin, a new address or a removed one", async () => {
    const fresh = await api
      .post("/api/users")
      .set(as(admin))
      .send({ email: "boss@example.com", role: "admin" });
    expect(fresh.status).toBe(403);
    expect(fresh.body.error).toEqual({ code: "OWNER_ONLY" });
    expect(await User.exists({ email: "boss@example.com" })).toBeNull();

    await User.updateOne({ _id: memberX._id }, { $set: { status: "removed" } });
    const reinvite = await api
      .post("/api/users")
      .set(as(admin))
      .send({ email: memberX.email, role: "admin" });
    expect(reinvite.status).toBe(403);
    expect(reinvite.body.error).toEqual({ code: "OWNER_ONLY" });
    expect((await User.findById(memberX._id).lean()).status).toBe("removed");

    const byOwner = await api
      .post("/api/users")
      .set(as(owner))
      .send({ email: "boss@example.com", role: "admin" });
    expect(byOwner.status).toBe(201);
    expect(byOwner.body.data.user.role).toBe("admin");
  });

  it("an admin manages members and managers", async () => {
    const role = await api
      .patch(`/api/users/${memberX._id}/role`)
      .set(as(admin))
      .send({ role: "manager" });
    expect(role.status).toBe(200);
    expect(role.body.data.role).toBe("manager");
    expect((await call("U12", admin, managerA._id)).status).toBe(200);
    expect((await call("U13", admin, managerB._id)).status).toBe(200);
  });
});

describe("U5 role and U6 removal", () => {
  it("checks in order: self, 404, owner, owner-only, removed", async () => {
    expect((await call("U5", admin, ghost)).body.error.code).toBe(
      "USER_NOT_FOUND",
    );
    await User.updateOne({ _id: memberX._id }, { $set: { status: "removed" } });
    const res = await call("U5", admin, memberX._id);
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({
      code: "USER_STATE_CHANGED",
      status: "removed",
    });
  });

  it("a role change ends the person's sessions; the same role is a no-op", async () => {
    const same = await api
      .patch(`/api/users/${managerA._id}/role`)
      .set(as(admin))
      .send({ role: "manager" });
    expect(same.status).toBe(200);
    expect((await api.get("/api/auth/me").set(as(managerA))).status).toBe(200);

    await api
      .patch(`/api/users/${managerA._id}/role`)
      .set(as(admin))
      .send({ role: "member" });
    expect((await api.get("/api/auth/me").set(as(managerA))).status).toBe(401);
    expect((await fresh(managerA)).role).toBe("member");
  });

  it("removal ends an open leave period in the same write", async () => {
    await api
      .put(`/api/users/${memberX._id}/leave`)
      .set(as(memberX))
      .send({ onLeave: true });
    const res = await call("U6", admin, memberX._id);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ onLeave: false, leaveSince: null });
    const stored = await User.findById(memberX._id).lean();
    expect(stored.leave).toHaveLength(1);
    expect(stored.leave[0].to).toBeInstanceOf(Date);
    expect(stored.leave[0].to.getTime()).toBe(
      stored.workPeriods[0].to.getTime(),
    );
  });

  it("removing twice → 409", async () => {
    expect((await call("U6", admin, memberX._id)).status).toBe(200);
    const again = await call("U6", admin, memberX._id);
    expect(again.status).toBe(409);
    expect(again.body.error).toEqual({
      code: "USER_STATE_CHANGED",
      status: "removed",
    });
  });
});

describe("36 · transfer ownership", () => {
  it("the owner → a manager: one owner, the manager is an admin, their old token dies", async () => {
    const res = await call("U11", owner, managerA._id);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ isOwner: true, role: "admin" });

    expect(await User.countDocuments({ isOwner: true })).toBe(1);
    const previous = await fresh(owner);
    expect(previous.isOwner).toBeUndefined();
    expect(previous.role).toBe("admin");
    expect((await api.get("/api/auth/me").set(as(managerA))).status).toBe(401);

    // The previous owner's token still works (no role change) but carries no protection.
    const me = await api.get("/api/auth/me").set(as(owner));
    expect(me.status).toBe(200);
    expect(me.body.data).toMatchObject({
      isOwner: false,
      owner: { name: "Manager A." },
    });
    const takeBack = await call("U11", owner, managerA._id);
    expect(takeBack.body.error).toEqual({ code: "OWNER_ONLY" });
  });

  it("the owner → an admin keeps their token alive", async () => {
    expect((await call("U11", owner, admin._id)).status).toBe(200);
    const me = await api.get("/api/auth/me").set(as(admin));
    expect(me.status).toBe(200);
    expect(me.body.data.isOwner).toBe(true);
  });

  it("an admin → U11 → 403 OWNER_ONLY", async () => {
    const res = await call("U11", admin, managerA._id);
    expect(res.status).toBe(403);
    expect(res.body.error).toEqual({ code: "OWNER_ONLY" });
  });

  it("a member, or someone not active → 409 USER_STATE_CHANGED", async () => {
    const toMember = await call("U11", owner, memberX._id);
    expect(toMember.status).toBe(409);
    expect(toMember.body.error.code).toBe("USER_STATE_CHANGED");
    const invitee = await createUser({
      role: "manager",
      status: "invited",
      name: "",
    });
    expect((await call("U11", owner, invitee._id)).status).toBe(409);
    expect((await call("U11", owner, ghost)).status).toBe(404);
    expect((await fresh(owner)).isOwner).toBe(true);
  });
});

describe("37 · change an email", () => {
  it("ends the person's sessions; they sign in with the new address", async () => {
    const res = await call("U12", admin, memberX._id);
    expect(res.status).toBe(200);
    expect((await api.get("/api/auth/me").set(as(memberX))).status).toBe(401);
    const login = await api
      .post("/api/auth/login")
      .send({ email: "changed@example.com", password: PASSWORD });
    expect(login.status).toBe(200);
  });

  it("an address in use → 409 USER_EXISTS, a removed person → 409", async () => {
    const taken = await api
      .patch(`/api/users/${memberX._id}/email`)
      .set(as(admin))
      .send({ email: memberY.email.toUpperCase() });
    expect(taken.status).toBe(409);
    expect(taken.body.error).toEqual({ code: "USER_EXISTS" });

    await User.updateOne({ _id: memberY._id }, { $set: { status: "removed" } });
    const removed = await call("U12", admin, memberY._id);
    expect(removed.body.error).toEqual({
      code: "USER_STATE_CHANGED",
      status: "removed",
    });
  });
});

describe("38 · reset links", () => {
  it("sets a password, ends other sessions, and is single-use", async () => {
    const issue = await call("U13", admin, memberX._id);
    expect(issue.status).toBe(200);
    const { linkUrl, expiresAt } = issue.body.data;
    expect(linkUrl).toMatch(
      /^http:\/\/localhost:5173\/reset\/[A-Za-z0-9_-]{43}$/,
    );
    const hours = (new Date(expiresAt) - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(23.9);
    expect(hours).toBeLessThanOrEqual(24);
    const token = linkUrl.split("/").at(-1);

    const preview = await api.post("/api/auth/links/preview").send({ token });
    expect(preview.body.data).toEqual({
      purpose: "reset",
      email: memberX.email,
    });

    const accept = await api
      .post("/api/auth/links/accept")
      .send({ token, password: "a brand new one" });
    expect(accept.status).toBe(201);
    expect((await api.get("/api/auth/me").set(as(memberX))).status).toBe(401);
    expect(
      (
        await api
          .post("/api/auth/login")
          .send({ email: memberX.email, password: "a brand new one" })
      ).status,
    ).toBe(200);

    const again = await api
      .post("/api/auth/links/accept")
      .send({ token, password: "a brand new one" });
    expect(again.status).toBe(404);
    expect(again.body.error).toEqual({ code: "LINK_INVALID" });
  });

  it("an invite token is not a reset token, and the reverse", async () => {
    const invite = await api
      .post("/api/users")
      .set(as(admin))
      .send({ email: "imali@example.com", role: "member" });
    const inviteToken = invite.body.data.linkUrl.split("/").at(-1);
    // Forced into an active account, the invite link must not work as a reset.
    await User.updateOne(
      { email: "imali@example.com" },
      { $set: { status: "active", name: "I" } },
    );
    const asReset = await api
      .post("/api/auth/links/accept")
      .send({ token: inviteToken, password: "long enough" });
    expect(asReset.status).toBe(404);
    expect(asReset.body.error).toEqual({ code: "LINK_INVALID" });

    const reset = await call("U13", admin, memberY._id);
    const resetToken = reset.body.data.linkUrl.split("/").at(-1);
    await User.updateOne({ _id: memberY._id }, { $set: { status: "invited" } });
    const asInvite = await api
      .post("/api/auth/links/accept")
      .send({ token: resetToken, name: "Y", password: "long enough" });
    expect(asInvite.status).toBe(404);
  });

  it("the target must be active", async () => {
    const invitee = await createUser({ status: "invited", name: "" });
    const res = await call("U13", admin, invitee._id);
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({
      code: "USER_STATE_CHANGED",
      status: "invited",
    });
  });
});

describe("39 · removal and re-invite", () => {
  it("kills the token, then reactivates the same _id with a second work period", async () => {
    expect((await call("U6", admin, memberX._id)).status).toBe(200);
    expect((await api.get("/api/auth/me").set(as(memberX))).status).toBe(401);
    const removed = await fresh(memberX);
    expect(removed.status).toBe("removed");
    expect(removed.workPeriods).toHaveLength(1);
    expect(removed.workPeriods[0].to).toBeInstanceOf(Date);

    const reinvite = await api
      .post("/api/users")
      .set(as(admin))
      .send({ email: memberX.email, role: "manager" });
    expect(reinvite.status).toBe(200);
    expect(String(reinvite.body.data.user._id)).toBe(String(memberX._id));
    expect(reinvite.body.data.user).toMatchObject({
      status: "invited",
      role: "manager",
    });
    const reinvited = await User.findById(memberX._id)
      .select("+passwordHash")
      .lean();
    expect(reinvited.passwordHash).toBeUndefined();

    const token = reinvite.body.data.linkUrl.split("/").at(-1);
    const accept = await api
      .post("/api/auth/links/accept")
      .send({ token, name: "Member X. again", password: "back again" });
    expect(accept.status).toBe(201);
    expect(String(accept.body.data.user._id)).toBe(String(memberX._id));
    const back = await fresh(memberX);
    expect(back.workPeriods).toHaveLength(2);
    expect(back.workPeriods[0].to).toBeInstanceOf(Date);
    expect(back.workPeriods[1].to).toBeNull();
    // D1's `expected` for the weeks between the two periods is checked in S6.
  });

  it("an active or invited address → 409 USER_EXISTS", async () => {
    const active = await api
      .post("/api/users")
      .set(as(admin))
      .send({ email: memberX.email, role: "member" });
    expect(active.status).toBe(409);
    expect(active.body.error).toEqual({ code: "USER_EXISTS" });
    await api
      .post("/api/users")
      .set(as(admin))
      .send({ email: "a@example.com", role: "member" });
    const invited = await api
      .post("/api/users")
      .set(as(admin))
      .send({ email: "a@example.com", role: "member" });
    expect(invited.status).toBe(409);
  });

  it("projects must be active project ids", async () => {
    const live = await Project.create({ name: "Client A" });
    const old = await Project.create({ name: "Old", status: "inactive" });
    const bad = await api
      .post("/api/users")
      .set(as(admin))
      .send({
        email: "p@example.com",
        role: "member",
        projects: [String(old._id)],
      });
    expect(bad.status).toBe(422);
    expect(bad.body.error.fields).toHaveProperty("projects");

    const good = await api
      .post("/api/users")
      .set(as(admin))
      .send({
        email: "p@example.com",
        role: "member",
        projects: [String(live._id)],
      });
    expect(good.status).toBe(201);
    expect(good.body.data.user.projects).toEqual([
      { _id: String(live._id), name: "Client A", status: "active" },
    ]);
  });
});

describe("40 · GET /users never carries a credential", () => {
  it("has no token, hash or tokenVersion, even with live links", async () => {
    const invite = await api
      .post("/api/users")
      .set(as(admin))
      .send({ email: "imali@example.com", role: "member" });
    const reset = await call("U13", admin, memberX._id);
    const raw = [invite, reset].map((r) =>
      r.body.data.linkUrl.split("/").at(-1),
    );

    const res = await api.get("/api/users?limit=100").set(as(managerA));
    expect(res.status).toBe(200);
    const body = JSON.stringify(res.body);
    for (const token of raw) expect(body).not.toContain(token);
    for (const key of [
      "passwordHash",
      "linkTokenHash",
      "tokenVersion",
      "linkTokenPurpose",
      "linkUrl",
    ])
      expect(body).not.toContain(key);
    const single = JSON.stringify(
      (await call("U2", managerA, memberX._id)).body,
    );
    expect(single).not.toContain("tokenVersion");
    expect(single).not.toContain("Hash");
  });
});

describe("U1 and U2 — the people list", () => {
  it("serves the U1 item shape", async () => {
    await Report.create({
      author: memberX._id,
      weekKey: "2026-W10",
      weekStart: new Date("2026-03-02"),
      weekEnd: new Date("2026-03-06"),
      status: "submitted",
      revisionNumber: 1,
      lastActivityAt: new Date("2026-03-06T17:00:00.000Z"),
    });
    await Report.create({
      author: memberX._id,
      weekKey: "2026-W11",
      weekStart: new Date("2026-03-09"),
      weekEnd: new Date("2026-03-13"),
    });
    const res = await call("U2", managerA, memberX._id);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      _id: String(memberX._id),
      name: "Member X.",
      email: memberX.email,
      role: "member",
      status: "active",
      projects: [],
      joinedAt: "2026-01-05T00:00:00.000Z",
      removedAt: null,
      linkExpiresAt: null,
      reportsFiled: 1,
      lastActivityAt: "2026-03-06T17:00:00.000Z",
      isOwner: false,
      onLeave: false,
      leaveSince: null,
    });
    expect((await call("U2", managerA, ghost)).body.error).toEqual({
      code: "USER_NOT_FOUND",
    });
    expect((await call("U2", managerA, "nope")).status).toBe(422);
  });

  it("filters by q, role, status and project, and paginates", async () => {
    const project = await Project.create({ name: "Client B" });
    await User.updateOne(
      { _id: memberY._id },
      { $set: { projects: [project._id] } },
    );
    await createUser({ name: "Gone G.", status: "removed" });

    const get = async (qs) =>
      (await api.get(`/api/users?${qs}`).set(as(admin))).body.data;

    expect((await get("")).meta).toEqual({
      page: 1,
      limit: 20,
      total: 7,
      totalPages: 1,
    });
    expect((await get("q=member%20x")).items.map((u) => u.name)).toEqual([
      "Member X.",
    ]);
    expect((await get("q=.*")).items).toEqual([]); // regex-escaped
    expect((await get("role=manager,admin")).items).toHaveLength(4);
    expect((await get("status=removed")).items.map((u) => u.name)).toEqual([
      "Gone G.",
    ]);
    expect(
      (await get(`project=${project._id}`)).items.map((u) => u.name),
    ).toEqual(["Member Y."]);
    const names = (await get("sort=name&dir=desc")).items.map((u) => u.name);
    expect(names[0]).toBe("Owner O.");
    expect(names.at(-1)).toBe("Admin A.");
    const page = await get("limit=20&page=2");
    expect(page.items).toEqual([]);
    expect(page.meta.total).toBe(7);

    for (const bad of [
      "sort=email",
      "role=boss",
      "limit=10",
      "status=",
      "dir=up",
    ])
      expect((await api.get(`/api/users?${bad}`).set(as(admin))).status).toBe(
        422,
      );
  });

  it("derives removedAt and linkExpiresAt", async () => {
    await call("U6", admin, memberX._id);
    const invite = await api
      .post("/api/users")
      .set(as(admin))
      .send({ email: "imali@example.com", role: "member" });
    const items = (
      await api.get("/api/users?status=removed,invited").set(as(admin))
    ).body.data.items;
    const removed = items.find((u) => u.status === "removed");
    const invited = items.find((u) => u.status === "invited");
    expect(removed.removedAt).toEqual(expect.any(String));
    expect(invited).toMatchObject({
      name: "",
      joinedAt: null,
      linkExpiresAt: invite.body.data.expiresAt,
    });
  });
});

describe("U9 and U10 — leave", () => {
  it("the person sets their own leave and gets Me back; it is idempotent", async () => {
    const on = await api
      .put(`/api/users/${memberX._id}/leave`)
      .set(as(memberX))
      .send({ onLeave: true });
    expect(on.status).toBe(200);
    expect(on.body.data).toMatchObject({
      onLeave: true,
      owner: expect.any(Object),
    });
    await api
      .put(`/api/users/${memberX._id}/leave`)
      .set(as(memberX))
      .send({ onLeave: true });
    let stored = await fresh(memberX);
    expect(stored.leave).toHaveLength(1);
    expect(String(stored.leave[0].setBy)).toBe(String(memberX._id));

    const list = await api.get("/api/users/on-leave").set(as(memberY));
    expect(list.status).toBe(200);
    expect(list.body.data).toEqual({
      items: [
        {
          _id: String(memberX._id),
          name: "Member X.",
          role: "member",
          status: "active",
          onLeave: true,
        },
      ],
    });

    for (let i = 0; i < 2; i += 1) {
      const off = await api
        .put(`/api/users/${memberX._id}/leave`)
        .set(as(memberX))
        .send({ onLeave: false });
      expect(off.body.data.onLeave).toBe(false);
    }
    stored = await fresh(memberX);
    expect(stored.leave).toHaveLength(1);
    expect(stored.leave[0].to).toBeInstanceOf(Date);
    expect(
      (await api.get("/api/users/on-leave").set(as(memberY))).body.data.items,
    ).toEqual([]);
  });

  it("a manager sets anyone's leave and gets a U1 item; a member can't set another's", async () => {
    const res = await api
      .put(`/api/users/${memberY._id}/leave`)
      .set(as(managerA))
      .send({ onLeave: true });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      onLeave: true,
      leaveSince: expect.any(String),
    });
    expect(res.body.data).not.toHaveProperty("owner");
    expect(String((await fresh(memberY)).leave[0].setBy)).toBe(
      String(managerA._id),
    );

    const denied = await api
      .put(`/api/users/${memberY._id}/leave`)
      .set(as(memberX))
      .send({ onLeave: false });
    expect(denied.status).toBe(403);
    expect(denied.body.error).toEqual({ code: "FORBIDDEN" });
  });

  it("the target must be active", async () => {
    await User.updateOne({ _id: memberY._id }, { $set: { status: "removed" } });
    const res = await api
      .put(`/api/users/${memberY._id}/leave`)
      .set(as(admin))
      .send({ onLeave: true });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({
      code: "USER_STATE_CHANGED",
      status: "removed",
    });
    const ghostRes = await api
      .put(`/api/users/${ghost}/leave`)
      .set(as(admin))
      .send({ onLeave: true });
    expect(ghostRes.status).toBe(404);
  });
});

describe("HD1–HD4 — holidays", () => {
  const add = (body, actor = admin) =>
    api.post("/api/holidays").set(as(actor)).send(body);
  const year = "/api/holidays?from=2026-01-01&to=2026-12-31";

  it("an admin adds one; everyone reads them by date with the creator", async () => {
    const res = await add({ date: "2026-09-08", name: "  Poya  " });
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({
      _id: expect.any(String),
      date: "2026-09-08",
      name: "Poya",
      createdBy: {
        _id: String(admin._id),
        name: "Admin A.",
        role: "admin",
        status: "active",
        onLeave: false,
      },
    });
    await add({ date: "2026-04-14", name: "New Year" }, owner);
    await add({ date: "2027-01-15", name: "Next year" });

    for (const actor of [memberX, managerA, admin]) {
      const list = await api.get(year).set(as(actor));
      expect(list.status).toBe(200);
      expect(list.body.data).toEqual({ items: expect.any(Array) });
      expect(list.body.data.items.map((h) => [h.date, h.name])).toEqual([
        ["2026-04-14", "New Year"],
        ["2026-09-08", "Poya"],
      ]);
    }
  });

  it("a date already taken → 409 HOLIDAY_EXISTS; a weekend → 422", async () => {
    await add({ date: "2026-09-08", name: "Poya" });
    let res = await add({ date: "2026-09-08", name: "Again" });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: "HOLIDAY_EXISTS" });

    res = await add({ date: "2026-09-12", name: "Saturday" });
    expect(res.status).toBe(422);
    expect(res.body.error).toEqual({
      code: "VALIDATION_FAILED",
      fields: { date: "Pick a Monday to Friday" },
    });
    for (const body of [
      { date: "2026-09-31", name: "No such day" },
      { date: "8 Sep 2026", name: "Wrong form" },
      { date: "2026-09-09", name: "" },
      { date: "2026-09-09", name: "x".repeat(101) },
    ]) {
      expect((await add(body)).status).toBe(422);
    }
    expect(await Holiday.countDocuments()).toBe(1);
  });

  it("HD3 renames or moves one; a taken date → 409; unknown → 404", async () => {
    const a = (await add({ date: "2026-09-08", name: "A" })).body.data;
    await add({ date: "2026-09-09", name: "B" });
    const edit = (id, body) =>
      api.patch(`/api/holidays/${id}`).set(as(admin)).send(body);

    let res = await edit(a._id, { name: "A renamed", date: "2026-09-10" });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      date: "2026-09-10",
      name: "A renamed",
    });
    res = await edit(a._id, { date: "2026-09-09" });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: "HOLIDAY_EXISTS" });
    res = await edit(a._id, { date: "2026-09-13" });
    expect(res.status).toBe(422);
    res = await edit(a._id, {});
    expect(res.status).toBe(422);
    res = await edit(ghost, { name: "Nobody" });
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({ code: "HOLIDAY_NOT_FOUND" });
  });

  it("HD4 deletes for real; again → 404", async () => {
    const a = (await add({ date: "2026-09-08", name: "A" })).body.data;
    let res = await api.delete(`/api/holidays/${a._id}`).set(as(admin));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ _id: a._id, date: "2026-09-08" });
    expect(await Holiday.countDocuments()).toBe(0);
    res = await api.delete(`/api/holidays/${a._id}`).set(as(admin));
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({ code: "HOLIDAY_NOT_FOUND" });
  });

  it("HD1 needs from ≤ to, at most one year apart", async () => {
    const get = (q) => api.get(`/api/holidays${q}`).set(as(memberX));
    expect((await get("?from=2026-01-01&to=2027-01-01")).status).toBe(200);
    for (const q of [
      "",
      "?from=2026-01-01",
      "?from=2026-01-02&to=2026-01-01",
      "?from=2026-01-01&to=2027-01-02",
      "?from=2026-13-01&to=2026-12-31",
    ]) {
      const res = await get(q);
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_FAILED");
    }
  });
});
