import { describe, expect, it } from "vitest";
import {
  enumParam,
  limitParam,
  listParam,
  pageParam,
  parseParams,
  textParam,
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

describe("urlParams — what useUrlFilters relies on", () => {
  it("reads a text search, trimmed and capped, and never writes an empty one", () => {
    const q = textParam();
    expect(q.parse("  imali  ")).toBe("imali");
    expect(q.parse("x".repeat(150))).toHaveLength(100);
    expect(q.parse(null)).toBe("");
    expect(q.serialize("")).toBeNull();
    expect(q.serialize("imali")).toBe("imali");
  });

  it("round-trips every value it writes", () => {
    const sort = enumParam(["submittedAt", "weekKey"], "submittedAt");
    const person = listParam();
    const week = weekParam();
    expect(sort.parse(sort.serialize("weekKey"))).toBe("weekKey");
    expect(person.parse(person.serialize(["a", "b"]))).toEqual(["a", "b"]);
    expect(week.parse(week.serialize("2026-W40"))).toBe("2026-W40");
  });

  it("treats a hand-edited URL as the defaults and never throws", () => {
    const values = parseParams(
      spec,
      new URLSearchParams(
        "approval=%00&role=,,&weekFrom=&page=abc&limit=&junk=1",
      ),
    );
    expect(values).toEqual({
      approval: "requested",
      role: [],
      weekFrom: null,
      page: 1,
      limit: 20,
    });
  });
});
