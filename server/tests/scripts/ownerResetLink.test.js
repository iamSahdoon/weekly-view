import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { User } from "../../src/models/userModel.js";
import {
  RecoveryError,
  issueOwnerResetLink,
  parseArgs,
  parseSiteUrl,
} from "../../src/scripts/ownerResetLink.js";
import { hashLinkToken } from "../../src/services/userService.js";
import { bearer, createUser } from "../helpers/testAuth.js";
import { clearDb } from "../helpers/testDb.js";

// requirments_doc.md §11.3, "If the owner forgets their password": the operator's
// command issues the owner a normal reset link and changes nothing else.

const api = request(app);
const OLD_PASSWORD = "the forgotten one";
const tokenOf = (linkUrl) => linkUrl.split("/").at(-1);
const reload = (user) => User.findById(user._id).select("+passwordHash").lean();
const accept = (token, password = "a brand new password") =>
  api.post("/api/auth/links/accept").send({ token, password });
const LINK_FIELDS = "+linkTokenHash linkTokenPurpose linkTokenExpiresAt";

let owner, admin, member;

beforeEach(async () => {
  await clearDb();
  const passwordHash = await bcrypt.hash(OLD_PASSWORD, 4);
  owner = await createUser({
    name: "Olive Owner",
    email: "owner@example.com",
    role: "admin",
    isOwner: true,
    passwordHash,
  });
  admin = await createUser({ role: "admin", passwordHash });
  member = await createUser({ passwordHash });
});

describe("issuing the link", () => {
  it("is a valid, hashed, single-use, 24-hour reset link for the owner only", async () => {
    const before = Date.now();
    const result = await issueOwnerResetLink();

    expect(result.owner).toEqual({
      name: "Olive Owner",
      email: "owner@example.com",
    });
    expect(result.linkUrl).toMatch(
      /^http:\/\/localhost:5173\/reset\/[A-Za-z0-9_-]{43}$/,
    );
    const hours = (result.expiresAt - before) / 3_600_000;
    expect(hours).toBeGreaterThan(23.99);
    expect(hours).toBeLessThan(24.01);

    const stored = await User.findById(owner._id).select(LINK_FIELDS).lean();
    expect(stored.linkTokenPurpose).toBe("reset");
    expect(stored.linkTokenExpiresAt).toEqual(result.expiresAt);
    expect(stored.linkTokenHash).toBe(hashLinkToken(tokenOf(result.linkUrl)));
    expect(stored.linkTokenHash).not.toContain(tokenOf(result.linkUrl));

    // Nobody else is touched, and the document set is unchanged.
    for (const other of [admin, member]) {
      const row = await User.findById(other._id).select(LINK_FIELDS).lean();
      expect(row.linkTokenHash).toBeUndefined();
      expect(row.linkTokenPurpose).toBeUndefined();
    }
    expect(await User.countDocuments()).toBe(3);
  });

  it("the reset flow accepts it, and rejects a second use", async () => {
    const { linkUrl } = await issueOwnerResetLink();
    const token = tokenOf(linkUrl);

    const preview = await api.post("/api/auth/links/preview").send({ token });
    expect(preview.status).toBe(200);
    expect(preview.body.data).toMatchObject({
      purpose: "reset",
      email: "owner@example.com",
    });

    expect((await accept(token)).status).toBe(201);
    const login = await api
      .post("/api/auth/login")
      .send({ email: "owner@example.com", password: "a brand new password" });
    expect(login.status).toBe(200);
    expect(login.body.data.user.isOwner).toBe(true);

    const again = await accept(token, "another password");
    expect(again.status).toBe(404);
    expect(again.body.error).toEqual({ code: "LINK_INVALID" });
    const row = await User.findById(owner._id).select(LINK_FIELDS).lean();
    expect(row.linkTokenHash).toBeUndefined();
  });

  it("a previous link stops working — an admin's, and an earlier run's", async () => {
    // An earlier link, as an admin would have issued it (U13 is refused for the owner by
    // others, so the owner's own request stands in for it).
    const first = await api
      .post(`/api/users/${owner._id}/reset-link`)
      .set({ Authorization: bearer(owner) });
    expect(first.status).toBe(200);
    const firstToken = tokenOf(first.body.data.linkUrl);

    const second = await issueOwnerResetLink();
    const secondToken = tokenOf(second.linkUrl);
    expect(secondToken).not.toBe(firstToken);
    expect((await accept(firstToken)).status).toBe(404);

    const third = await issueOwnerResetLink();
    expect((await accept(secondToken)).status).toBe(404);
    expect((await accept(tokenOf(third.linkUrl))).status).toBe(201);
  });

  it("changes no password and ends no session until the owner completes the reset", async () => {
    const before = await reload(owner);
    const { linkUrl } = await issueOwnerResetLink();

    const after = await reload(owner);
    expect(after.passwordHash).toBe(before.passwordHash);
    expect(after.tokenVersion ?? 0).toBe(before.tokenVersion ?? 0);
    expect(
      (
        await api
          .post("/api/auth/login")
          .send({ email: "owner@example.com", password: OLD_PASSWORD })
      ).status,
    ).toBe(200);
    expect(
      (await api.get("/api/auth/me").set({ Authorization: bearer(owner) }))
        .status,
    ).toBe(200);

    expect((await accept(tokenOf(linkUrl))).status).toBe(201);
    const done = await reload(owner);
    expect(done.passwordHash).not.toBe(before.passwordHash);
    expect(
      (await api.get("/api/auth/me").set({ Authorization: bearer(owner) }))
        .status,
    ).toBe(401);
    // Everyone else keeps their password.
    expect((await reload(member)).passwordHash).toBe(member.passwordHash);
    expect((await reload(admin)).passwordHash).toBe(admin.passwordHash);
  });

  it("builds the link from --url when given", async () => {
    const { linkUrl } = await issueOwnerResetLink({
      url: parseSiteUrl("https://weekly.example.com/"),
    });
    expect(linkUrl).toMatch(
      /^https:\/\/weekly\.example\.com\/reset\/[A-Za-z0-9_-]{43}$/,
    );
    // And the token in it is the live one.
    const { status } = await accept(tokenOf(linkUrl));
    expect(status).toBe(201);
  });

  it("refuses cleanly when there is no owner", async () => {
    await User.updateMany({}, { $unset: { isOwner: "" } });
    await expect(issueOwnerResetLink()).rejects.toThrow(RecoveryError);
    await expect(issueOwnerResetLink()).rejects.toThrow(/no owner/);
    expect(
      await User.countDocuments({ linkTokenPurpose: { $exists: true } }),
    ).toBe(0);
  });
});

describe("the site address", () => {
  it("accepts http(s) addresses and strips trailing slashes", () => {
    expect(parseSiteUrl("https://weekly.example.com")).toBe(
      "https://weekly.example.com",
    );
    expect(parseSiteUrl("https://weekly.example.com///")).toBe(
      "https://weekly.example.com",
    );
    expect(parseSiteUrl("http://localhost:5173/")).toBe(
      "http://localhost:5173",
    );
    expect(parseSiteUrl("https://example.com/app/")).toBe(
      "https://example.com/app",
    );
  });

  it.each([
    "weekly.example.com",
    "ftp://weekly.example.com",
    "javascript:alert(1)",
    "https://user:pw@weekly.example.com",
    "https://weekly.example.com/?a=1",
    "https://weekly.example.com/#x",
    "",
  ])("rejects %j", (value) => {
    expect(() => parseSiteUrl(value)).toThrow(RecoveryError);
  });

  it("reads --url <address> and --url=<address>", () => {
    expect(parseArgs([])).toEqual({ url: undefined });
    expect(parseArgs(["--url", "https://a.example.com/"])).toEqual({
      url: "https://a.example.com",
    });
    expect(parseArgs(["--url=https://a.example.com"])).toEqual({
      url: "https://a.example.com",
    });
    expect(() => parseArgs(["--url"])).toThrow(/needs a site address/);
  });

  it("reads the address as a single bare argument (PowerShell drops the first --)", () => {
    expect(parseArgs(["https://a.example.com/"])).toEqual({
      url: "https://a.example.com",
    });
    expect(parseArgs(["http://localhost:5173///"])).toEqual({
      url: "http://localhost:5173",
    });
    expect(() => parseArgs(["a.example.com"])).toThrow(/isn't a web address/);
    expect(() => parseArgs(["https://a.example.com/?x=1"])).toThrow(
      /no login, query or #/,
    );
    expect(() => parseArgs(["https://u:p@a.example.com"])).toThrow(
      /no login, query or #/,
    );
  });

  it("falls back to npm's own url config when npm swallowed --url", () => {
    const env = { npm_config_url: "https://a.example.com/" };
    expect(parseArgs([], env)).toEqual({ url: "https://a.example.com" });
    // An address on the command line wins over the environment.
    expect(parseArgs(["https://b.example.com"], env)).toEqual({
      url: "https://b.example.com",
    });
    expect(parseArgs([], { npm_config_url: "" })).toEqual({ url: undefined });
    // Validated like any other: npm sets "true" for a bare `--url`.
    expect(() => parseArgs([], { npm_config_url: "true" })).toThrow(
      RecoveryError,
    );
    expect(() =>
      parseArgs([], { npm_config_url: "ftp://a.example.com" }),
    ).toThrow(/http:\/\/ or https:\/\//);
  });

  it("refuses more than one address and any other flag", () => {
    expect(() =>
      parseArgs(["https://a.example.com", "https://b.example.com"]),
    ).toThrow(/once/);
    expect(() =>
      parseArgs(["--url", "https://a.example.com", "https://b.example.com"]),
    ).toThrow(/once/);
    expect(() =>
      parseArgs([
        "--url=https://a.example.com",
        "--url",
        "https://a.example.com",
      ]),
    ).toThrow(/once/);
    expect(() => parseArgs(["--password", "x"])).toThrow(/Unknown option/);
    expect(() => parseArgs(["-u", "https://a.example.com"])).toThrow(
      /Unknown option "-u"/,
    );
    expect(() => parseArgs(["https://a.example.com", "--force"])).toThrow(
      /Unknown option "--force"/,
    );
  });

  it.each([
    ["--url", ["--url", "not-a-url"], {}],
    ["a bare address", ["not-a-url"], {}],
    ["npm's url config", [], { npm_config_url: "not-a-url" }],
  ])(
    "the command refuses a bad address (%s) before it connects to anything",
    (_, args, extraEnv) => {
      const run = spawnSync(
        process.execPath,
        ["src/scripts/ownerResetLink.js", ...args],
        {
          cwd: fileURLToPath(new URL("../..", import.meta.url)),
          env: {
            ...process.env,
            MONGODB_URI: "mongodb://127.0.0.1:1/never",
            ...extraEnv,
          },
          encoding: "utf8",
          timeout: 8000,
        },
      );
      expect(run.status).toBe(1);
      expect(run.stderr).toMatch(/isn't a web address/);
      expect(run.stdout).toBe("");
    },
  );
});
