import { describe, expect, it } from "vitest";
import { peopleParams, showsHiddenStatuses } from "../peopleParams.js";

// The search-overrides-status rule (design §3.15, frontend_architecture.md §9.10).

const ID = "66f1a1a1a1a1a1a1a1a1a1a1";

describe("peopleParams", () => {
  const api = {
    status: "active",
    page: 1,
    limit: 20,
    sort: "name",
    dir: "asc",
  };

  it("sends the status filter while nobody is searching", () => {
    expect(peopleParams(api, { q: "", status: "active", project: "" })).toEqual(
      api,
    );
  });

  it("leaves status out while a search is set, so it reaches every status", () => {
    const params = peopleParams(
      { ...api, q: "dinesh" },
      { q: "dinesh", status: "active", project: "" },
    );
    expect(params).not.toHaveProperty("status");
    expect(params.q).toBe("dinesh");
  });

  it("leaves status out for All, and a project that isn't an id", () => {
    const params = peopleParams(
      { ...api, status: "all", project: "nope" },
      { q: "", status: "all", project: "nope" },
    );
    expect(params).not.toHaveProperty("status");
    expect(params).not.toHaveProperty("project");
    expect(
      peopleParams(
        { ...api, project: ID },
        { q: "", status: "active", project: ID },
      ).project,
    ).toBe(ID);
  });
});

describe("showsHiddenStatuses", () => {
  const items = [{ status: "active" }, { status: "removed" }];
  it("says so when a search brings back a row the filter would have hidden", () => {
    expect(showsHiddenStatuses({ q: "x", status: "active" }, items)).toBe(true);
  });
  it("stays quiet without a search, with All, or when nothing was hidden", () => {
    expect(showsHiddenStatuses({ q: "", status: "active" }, items)).toBe(false);
    expect(showsHiddenStatuses({ q: "x", status: "all" }, items)).toBe(false);
    expect(
      showsHiddenStatuses({ q: "x", status: "active" }, [{ status: "active" }]),
    ).toBe(false);
  });
});
