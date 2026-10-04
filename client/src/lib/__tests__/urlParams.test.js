import { describe, expect, it } from "vitest";
import {
  enumParam,
  limitParam,
  listParam,
  pageParam,
  parseParams,
  toApiParams,
  weekParam,
} from "../urlParams.js";

const spec = {
  approval: enumParam(["requested", "all"], "requested"),
  role: listParam(["member", "manager", "admin"]),
  weekFrom: weekParam(),
  page: pageParam(),
  limit: limitParam(),
};

describe("urlParams", () => {
  it("replaces invalid values with the default", () => {
    const values = parseParams(
      spec,
      new URLSearchParams(
        "approval=bogus&role=admin,ceo,admin&weekFrom=2026-W99&page=-2&limit=30",
      ),
    );
    expect(values).toEqual({
      approval: "requested",
      role: ["admin"],
      weekFrom: null,
      page: 1,
      limit: 20,
    });
  });

  it("never writes a default to the URL", () => {
    expect(spec.approval.serialize("requested")).toBeNull();
    expect(spec.approval.serialize("all")).toBe("all");
    expect(spec.role.serialize([])).toBeNull();
    expect(spec.page.serialize(1)).toBeNull();
    expect(spec.limit.serialize(50)).toBe("50");
  });

  it("builds the API's params: lists as comma strings, empties dropped, page and limit always", () => {
    const values = {
      approval: "all",
      role: ["member", "manager"],
      weekFrom: null,
      page: 1,
      limit: 20,
    };
    expect(toApiParams(spec, values)).toEqual({
      approval: "all",
      role: "member,manager",
      page: 1,
      limit: 20,
    });
  });
});
