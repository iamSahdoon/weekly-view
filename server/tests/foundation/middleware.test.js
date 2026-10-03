import { beforeEach, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { z } from "zod";
import { authenticate } from "../../src/middleware/authenticate.js";
import { authorize } from "../../src/middleware/authorize.js";
import { errorHandler } from "../../src/middleware/errorHandler.js";
import { notFound } from "../../src/middleware/notFound.js";
import { validate } from "../../src/middleware/validate.js";
import { Holiday } from "../../src/models/holidayModel.js";
import { Project } from "../../src/models/projectModel.js";
import { User } from "../../src/models/userModel.js";
import { ok } from "../../src/utils/apiResponse.js";
import { bearer, createUser } from "../helpers/testAuth.js";
import { clearDb } from "../helpers/testDb.js";

// A throwaway app wired with the real middleware, so each piece is tested in the chain
// order the routes will use: validate → authenticate → authorize → handler.
const schema = z.object({
  params: z.object({ id: z.string().regex(/^[0-9a-f]{24}$/) }),
  query: z.object({ n: z.coerce.number().int().default(1) }),
  body: z.object({ email: z.email() }),
});

const testApp = express();
testApp.use(express.json());
testApp.post("/echo/:id", validate(schema), (req, res) =>
  ok(res, req.validated, null, 201),
);
testApp.get("/me", authenticate, (req, res) => ok(res, { id: req.user._id }));
testApp.get(
  "/manager",
  validate(z.object({})),
  authenticate,
  authorize("manager"),
  (req, res) => ok(res, { role: req.user.role }),
);
testApp.post("/strict/:id", validate(schema), authenticate, (req, res) =>
  ok(res, null),
);
testApp.post("/create/:what", async (req, res) => {
  const create = {
    user: () => User.create(req.body),
    holiday: () => Holiday.create(req.body),
    project: () => Project.create(req.body),
  }[req.params.what];
  ok(res, await create(), null, 201);
});
testApp.get("/boom", () => {
  throw new Error("secret internals");
});
testApp.use(notFound);
testApp.use(errorHandler);

beforeEach(clearDb);

describe("validate", () => {
  it("puts the parsed params, query and body on req.validated", async () => {
    const id = "a".repeat(24);
    const res = await request(testApp)
      .post(`/echo/${id}?n=3`)
      .send({ email: "x@example.com", extra: 1 });
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({
      params: { id },
      query: { n: 3 },
      body: { email: "x@example.com" },
    });
  });

  it("answers 422 VALIDATION_FAILED with a field map", async () => {
    const res = await request(testApp)
      .post("/echo/not-an-id?n=x")
      .send({ email: "nope" });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(Object.keys(res.body.error.fields).sort()).toEqual([
      "email",
      "id",
      "n",
    ]);
  });

  it("runs before authenticate, so a malformed request gets 422 before 401", async () => {
    const res = await request(testApp).post("/strict/bad").send({});
    expect(res.status).toBe(422);
  });
});

describe("authenticate", () => {
  it("admits an active user with a current token", async () => {
    const user = await createUser();
    const res = await request(testApp)
      .get("/me")
      .set("Authorization", bearer(user));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(String(user._id));
  });

  const cases = {
    "no header": async () => null,
    "not Bearer": async () => `Basic ${Buffer.from("a:b").toString("base64")}`,
    "garbage token": async () => "Bearer not.a.jwt",
    "wrong secret": async () => {
      const user = await createUser();
      const jwt = await import("jsonwebtoken");
      const token = jwt.default.sign(
        { sub: String(user._id), role: "member", tokenVersion: 0 },
        "x".repeat(40),
      );
      return `Bearer ${token}`;
    },
    expired: async () => bearer(await createUser(), { expiresIn: -10 }),
    "stale tokenVersion": async () => {
      const user = await createUser();
      await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });
      return bearer(user);
    },
    "removed user": async () => bearer(await createUser({ status: "removed" })),
    "invited user": async () =>
      bearer(await createUser({ status: "invited", name: "" })),
    "deleted user": async () => {
      const user = await createUser();
      await User.deleteOne({ _id: user._id });
      return bearer(user);
    },
  };

  it.each(Object.keys(cases))(
    "answers 401 UNAUTHENTICATED: %s",
    async (name) => {
      const header = await cases[name]();
      const req = request(testApp).get("/me");
      const res = header ? await req.set("Authorization", header) : await req;
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({
        success: false,
        data: null,
        error: { code: "UNAUTHENTICATED" },
      });
    },
  );
});

describe("authorize", () => {
  it.each([
    ["member", 403],
    ["manager", 200],
    ["admin", 200],
  ])("authorize('manager') gives a %s %i", async (role, status) => {
    const user = await createUser({ role });
    const res = await request(testApp)
      .get("/manager")
      .set("Authorization", bearer(user));
    expect(res.status).toBe(status);
    if (status === 403) expect(res.body.error).toEqual({ code: "FORBIDDEN" });
  });

  it("refuses an unknown role at declaration", () => {
    expect(() => authorize("owner")).toThrow();
  });
});

describe("errorHandler", () => {
  const post = (what, body) =>
    request(testApp).post(`/create/${what}`).send(body);

  it("maps a duplicate email to 409 USER_EXISTS", async () => {
    expect(
      (await post("user", { name: "A", email: "a@example.com" })).status,
    ).toBe(201);
    const res = await post("user", { name: "B", email: "A@Example.com" });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: "USER_EXISTS" });
  });

  it("maps a second owner to 403 SIGNUP_CLOSED", async () => {
    expect(
      (await post("user", { name: "A", email: "a@example.com", isOwner: true }))
        .status,
    ).toBe(201);
    const res = await post("user", {
      name: "B",
      email: "b@example.com",
      isOwner: true,
    });
    expect(res.status).toBe(403);
    expect(res.body.error).toEqual({ code: "SIGNUP_CLOSED" });
  });

  it("maps a second holiday on a date to 409 HOLIDAY_EXISTS", async () => {
    const body = {
      date: "2026-09-16",
      name: "Poya",
      createdBy: "a".repeat(24),
    };
    expect((await post("holiday", body)).status).toBe(201);
    const res = await post("holiday", { ...body, name: "Other" });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: "HOLIDAY_EXISTS" });
  });

  it("maps a case-insensitive project name clash to 409 PROJECT_NAME_TAKEN", async () => {
    expect((await post("project", { name: "Client A" })).status).toBe(201);
    const res = await post("project", { name: "client a" });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: "PROJECT_NAME_TAKEN" });
  });

  it("answers anything unhandled with 500 INTERNAL_ERROR and no internals", async () => {
    const res = await request(testApp).get("/boom");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      data: null,
      message: "Something went wrong.",
      error: { code: "INTERNAL_ERROR" },
    });
  });
});
