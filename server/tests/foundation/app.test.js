import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

describe("app", () => {
  it("H1 answers 200 in the envelope", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: { status: "ok" },
      message: null,
      error: null,
    });
  });

  it.each(["/nowhere", "/api/nowhere", "/api/reports/x/y/z"])(
    "answers an unknown route (%s) with 404 ROUTE_NOT_FOUND in the envelope",
    async (path) => {
      const res = await request(app).get(path);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        success: false,
        data: null,
        message: expect.any(String),
        error: { code: "ROUTE_NOT_FOUND" },
      });
    },
  );

  it("answers a body that isn't JSON with 422 VALIDATION_FAILED", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{ not json");
    expect(res.status).toBe(422);
    expect(res.body.error).toEqual({ code: "VALIDATION_FAILED", fields: {} });
  });

  it("allows the client origin only, without credentials", async () => {
    const res = await request(app)
      .get("/api/health")
      .set("Origin", "http://localhost:5173");
    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
    expect(res.headers["access-control-allow-credentials"]).toBeUndefined();
  });

  it("sets helmet's headers", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});
