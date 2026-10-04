import { describe, expect, it } from "vitest";
import { isObjectId, paramsAreValid } from "../routeParams.js";

describe("routeParams", () => {
  it("accepts a real weekKey and rejects the shapes that look like one", () => {
    expect(paramsAreValid(["week"], { week: "2026-W40" })).toBe(true);
    for (const week of [
      "2026-W00",
      "2026-W54",
      "2026-W7",
      "26-W40",
      "2026-w40",
      "2025-W53",
      "nope",
    ]) {
      expect(paramsAreValid(["week"], { week })).toBe(false);
    }
    // W53 exists only in a year that has one: 2026 does, 2025 does not.
    expect(paramsAreValid(["week"], { week: "2026-W53" })).toBe(true);
  });

  it("wants 24 hex characters for the two ids", () => {
    const id = "66f1a1b2c3d4e5f6a7b8c9d0";
    expect(isObjectId(id)).toBe(true);
    expect(
      paramsAreValid(["userId", "week"], { userId: id, week: "2026-W40" }),
    ).toBe(true);
    for (const bad of ["", "123", `${id}0`, id.replace("6", "g"), undefined]) {
      expect(paramsAreValid(["userId"], { userId: bad })).toBe(false);
      expect(paramsAreValid(["reportId"], { reportId: bad })).toBe(false);
    }
  });

  it("wants a non-empty token, and fails on a param it has no rule for", () => {
    expect(paramsAreValid(["token"], { token: "abc" })).toBe(true);
    expect(paramsAreValid(["token"], { token: "" })).toBe(false);
    expect(paramsAreValid(["mystery"], { mystery: "x" })).toBe(false);
  });
});
