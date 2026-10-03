import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";

// S0 placeholder, removed in S1 once the real test harness exists.
describe("bare app", () => {
  it("answers an unknown path with 404", async () => {
    const res = await request(app).get("/nowhere");
    expect(res.status).toBe(404);
  });
});
