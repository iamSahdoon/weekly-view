import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import request from "supertest";
import app from "../../src/app.js";
import { User } from "../../src/models/userModel.js";
import { bearer, createUser } from "../helpers/testAuth.js";
import { clearDb } from "../helpers/testDb.js";

// api_specification.md §6.7 (41, 42), the rest of A1–A8, and the S2 walkthrough:
// sign up on an empty database, log in, invite someone, complete the invite via A7/A8.

const api = request(app);
const PASSWORD = "correct horse battery";

const owner = {
  name: "Sanduni B.",
  email: "sanduni@example.com",
  password: PASSWORD,
};

async function signupOwner() {
  const res = await api.post("/api/auth/signup").send(owner);
  expect(res.status).toBe(201);
  return res.body.data;
}

const tokenFromUrl = (linkUrl) => linkUrl.split("/").at(-1);

beforeEach(async () => {
  await clearDb();
  vi.restoreAllMocks();
});

describe("A1 bootstrap and A2 signup", () => {
  it("is available on an empty database and closes after the first account", async () => {
    expect((await api.get("/api/auth/bootstrap")).body.data).toEqual({
      available: true,
    });
    const { token, user } = await signupOwner();
    expect(token).toEqual(expect.any(String));
    expect(user).toMatchObject({
      name: "Sanduni B.",
      email: "sanduni@example.com",
      role: "admin",
      status: "active",
      isOwner: true,
      onLeave: false,
      projects: [],
      owner: { name: "Sanduni B.", email: "sanduni@example.com" },
    });
    expect(user.joinedAt).toEqual(expect.any(String));
    expect((await api.get("/api/auth/bootstrap")).body.data).toEqual({
      available: false,
    });
  });

  it("41 · a non-empty database → 403 SIGNUP_CLOSED", async () => {
    await createUser();
    const res = await api.post("/api/auth/signup").send(owner);
    expect(res.status).toBe(403);
    expect(res.body.error).toEqual({ code: "SIGNUP_CLOSED" });
  });

  it("41 · two concurrent signups on an empty database → one 201, one 403", async () => {
    const [a, b] = await Promise.all([
      api.post("/api/auth/signup").send(owner),
      api
        .post("/api/auth/signup")
        .send({ ...owner, email: "other@example.com" }),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 403]);
    expect([a, b].find((r) => r.status === 403).body.error.code).toBe(
      "SIGNUP_CLOSED",
    );
    expect(await User.countDocuments()).toBe(1);
  });

  it("41 · when both pass the emptiness check, the isOwner index decides", async () => {
    // Forces the race past the read, so the unique partial index is what closes it.
    vi.spyOn(User, "exists").mockResolvedValue(null);
    const [a, b] = await Promise.all([
      api.post("/api/auth/signup").send(owner),
      api
        .post("/api/auth/signup")
        .send({ ...owner, email: "other@example.com" }),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 403]);
    expect([a, b].find((r) => r.status === 403).body.error.code).toBe(
      "SIGNUP_CLOSED",
    );
    expect(await User.countDocuments({ isOwner: true })).toBe(1);
  });

  it("validates the body", async () => {
    const res = await api
      .post("/api/auth/signup")
      .send({ name: "", email: "nope", password: "short" });
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.fields).sort()).toEqual([
      "email",
      "name",
      "password",
    ]);
  });
});

describe("A3 login", () => {
  it("signs in an active person, email case-insensitively", async () => {
    await signupOwner();
    const res = await api
      .post("/api/auth/login")
      .send({ email: " Sanduni@Example.com ", password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe("sanduni@example.com");
    const me = await api
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${res.body.data.token}`);
    expect(me.status).toBe(200);
  });

  it("answers every failure with one code and one message", async () => {
    await signupOwner();
    const hash = await bcrypt.hash(PASSWORD, 4);
    await createUser({
      email: "gone@example.com",
      status: "removed",
      passwordHash: hash,
    });
    await createUser({
      email: "invited@example.com",
      status: "invited",
      name: "",
    });

    const attempts = [
      { email: "nobody@example.com", password: PASSWORD },
      { email: "sanduni@example.com", password: "wrong password" },
      { email: "gone@example.com", password: PASSWORD },
      { email: "invited@example.com", password: PASSWORD },
    ];
    for (const body of attempts) {
      const res = await api.post("/api/auth/login").send(body);
      expect(res.status).toBe(401);
      expect(res.body.error).toEqual({ code: "INVALID_CREDENTIALS" });
      expect(res.body.message).toBe("That email and password don't match.");
    }
  });
});

describe("A4 me and A5 name", () => {
  it("serves Me and changes the name only", async () => {
    const { token } = await signupOwner();
    const res = await api
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "  Sanduni Bandara ", email: "x@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      name: "Sanduni Bandara",
      email: "sanduni@example.com",
    });
    expect(res.body.data).not.toHaveProperty("passwordHash");
    expect(res.body.data).not.toHaveProperty("tokenVersion");
  });

  it("a missing token → 401", async () => {
    expect((await api.get("/api/auth/me")).status).toBe(401);
  });
});

describe("A6 password", () => {
  it("42 · a wrong current password → 422 CURRENT_PASSWORD_INCORRECT, never 401", async () => {
    const { token } = await signupOwner();
    const res = await api
      .post("/api/auth/password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: "not it at all",
        newPassword: "a new password",
      });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("CURRENT_PASSWORD_INCORRECT");
    expect(res.body.error.fields).toHaveProperty("currentPassword");
  });

  it("sets the new password, returns a working token and ends other sessions", async () => {
    const { token: old } = await signupOwner();
    const res = await api
      .post("/api/auth/password")
      .set("Authorization", `Bearer ${old}`)
      .send({ currentPassword: PASSWORD, newPassword: "a new password" });
    expect(res.status).toBe(200);
    const fresh = res.body.data.token;

    expect(
      (await api.get("/api/auth/me").set("Authorization", `Bearer ${old}`))
        .status,
    ).toBe(401);
    expect(
      (await api.get("/api/auth/me").set("Authorization", `Bearer ${fresh}`))
        .status,
    ).toBe(200);
    expect(
      (
        await api
          .post("/api/auth/login")
          .send({ email: owner.email, password: "a new password" })
      ).status,
    ).toBe(200);
  });
});

describe("A7 and A8 links — the S2 walkthrough", () => {
  it("signs up, logs in, invites, and completes the invite from the returned URL", async () => {
    await signupOwner();
    const login = await api
      .post("/api/auth/login")
      .send({ email: owner.email, password: PASSWORD });
    const adminAuth = `Bearer ${login.body.data.token}`;

    const invite = await api
      .post("/api/users")
      .set("Authorization", adminAuth)
      .send({ email: "Imali@Example.com", role: "member" });
    expect(invite.status).toBe(201);
    const { linkUrl, expiresAt, user } = invite.body.data;
    expect(linkUrl).toMatch(
      /^http:\/\/localhost:5173\/invite\/[A-Za-z0-9_-]{43}$/,
    );
    expect(user).toMatchObject({
      email: "imali@example.com",
      status: "invited",
    });
    expect(user.linkExpiresAt).toBe(expiresAt);
    const days = (new Date(expiresAt) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.99);
    expect(days).toBeLessThanOrEqual(7);

    const token = tokenFromUrl(linkUrl);
    const preview = await api.post("/api/auth/links/preview").send({ token });
    expect(preview.status).toBe(200);
    expect(preview.body.data).toEqual({
      purpose: "invite",
      email: "imali@example.com",
      role: "member",
    });

    const accept = await api
      .post("/api/auth/links/accept")
      .send({ token, name: "Imali J.", password: "imali's password" });
    expect(accept.status).toBe(201);
    expect(accept.body.data.user).toMatchObject({
      name: "Imali J.",
      status: "active",
      role: "member",
      isOwner: false,
      owner: { email: owner.email },
    });
    const me = await api
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accept.body.data.token}`);
    expect(me.status).toBe(200);

    const stored = await User.findOne({ email: "imali@example.com" })
      .select("+linkTokenHash")
      .lean();
    expect(stored.linkTokenHash).toBeUndefined();
    expect(stored.linkTokenPurpose).toBeUndefined();
    expect(stored.linkTokenExpiresAt).toBeUndefined();
    expect(stored.workPeriods).toHaveLength(1);
    expect(stored.workPeriods[0].to).toBeNull();

    const again = await api
      .post("/api/auth/links/accept")
      .send({ token, name: "Imali J.", password: "imali's password" });
    expect(again.status).toBe(404);
    expect(again.body.error).toEqual({ code: "LINK_INVALID" });
  });

  async function invited() {
    const { token } = await signupOwner();
    const res = await api
      .post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "imali@example.com", role: "manager" });
    return {
      adminToken: token,
      ...res.body.data,
      token: tokenFromUrl(res.body.data.linkUrl),
    };
  }

  it("answers an expired, unknown or used link with one identical 404", async () => {
    const { token } = await invited();
    const unknown = await api
      .post("/api/auth/links/preview")
      .send({ token: "x".repeat(43) });

    await User.updateOne(
      { email: "imali@example.com" },
      { $set: { linkTokenExpiresAt: new Date(Date.now() - 1000) } },
    );
    const expiredPreview = await api
      .post("/api/auth/links/preview")
      .send({ token });
    const expiredAccept = await api
      .post("/api/auth/links/accept")
      .send({ token, name: "Imali", password: "long enough" });

    for (const res of [unknown, expiredPreview, expiredAccept]) {
      expect(res.status).toBe(404);
      expect(res.body).toEqual(unknown.body);
    }
  });

  it("an invite needs a name", async () => {
    const { token } = await invited();
    const res = await api
      .post("/api/auth/links/accept")
      .send({ token, password: "long enough" });
    expect(res.status).toBe(422);
    expect(res.body.error.fields).toHaveProperty("name");
  });

  it("two concurrent accepts → exactly one succeeds", async () => {
    const { token } = await invited();
    const body = { token, name: "Imali", password: "long enough" };
    const results = await Promise.all([
      api.post("/api/auth/links/accept").send(body),
      api.post("/api/auth/links/accept").send(body),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 404]);
    const stored = await User.findOne({ email: "imali@example.com" }).lean();
    expect(stored.workPeriods).toHaveLength(1);
  });

  it("re-issuing kills the previous link", async () => {
    const { adminToken, user, token: first } = await invited();
    const reissue = await api
      .post(`/api/users/${user._id}/invite-link`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(reissue.status).toBe(200);
    const second = tokenFromUrl(reissue.body.data.linkUrl);
    expect(second).not.toBe(first);
    expect(
      (await api.post("/api/auth/links/preview").send({ token: first })).status,
    ).toBe(404);
    expect(
      (await api.post("/api/auth/links/preview").send({ token: second }))
        .status,
    ).toBe(200);
  });

  it("stores only the SHA-256 of the token", async () => {
    const { token } = await invited();
    const stored = await User.findOne({ email: "imali@example.com" })
      .select("+linkTokenHash")
      .lean();
    expect(stored.linkTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.linkTokenHash).not.toContain(token);
    expect(JSON.stringify(stored)).not.toContain(token);
  });

  it("U4 on someone who isn't invited → 409 USER_STATE_CHANGED", async () => {
    const { token } = await signupOwner();
    const member = await createUser();
    const res = await api
      .post(`/api/users/${member._id}/invite-link`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({
      code: "USER_STATE_CHANGED",
      status: "active",
    });
  });

  it("reads a link token from the body only, never the URL", async () => {
    const { token } = await invited();
    const res = await api
      .post(`/api/auth/links/preview?token=${token}`)
      .send({});
    expect(res.status).toBe(422);
  });

  it("a JWT whose subject isn't a user id → 401", async () => {
    const res = await api
      .get("/api/auth/me")
      .set("Authorization", bearer({ _id: "x" }));
    expect(res.status).toBe(401);
  });
});
