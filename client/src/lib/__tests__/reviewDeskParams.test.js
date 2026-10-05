import { describe, expect, it } from "vitest";
import {
  REVIEW_DESK_SPEC,
  firstOther,
  nextInQueueParams,
} from "../reviewDeskParams.js";
import { parseParams, toApiParams } from "../urlParams.js";

// The review desk's address (design §3.5, frontend_architecture.md §9.6) and the query
// "Next in review desk" asks from it (§9.7).

const apiOf = (search) =>
  toApiParams(
    REVIEW_DESK_SPEC,
    parseParams(REVIEW_DESK_SPEC, new URLSearchParams(search)),
  );

describe("the desk's URL", () => {
  it("defaults to asked-for-approval, oldest first, page 1 of 20", () => {
    expect(apiOf("")).toEqual({
      approval: "requested",
      sort: "submittedAt",
      dir: "asc",
      page: 1,
      limit: 20,
    });
  });

  it("carries the filters as comma lists and the week range", () => {
    expect(
      apiOf(
        "?approval=all&person=a1,b2&role=manager&weekFrom=2026-W30&weekTo=2026-W35",
      ),
    ).toMatchObject({
      approval: "all",
      person: "a1,b2",
      role: "manager",
      weekFrom: "2026-W30",
      weekTo: "2026-W35",
    });
  });

  it("reads a hand-edited value as the default", () => {
    expect(
      apiOf("?approval=everything&role=boss&weekFrom=soon&sort=name"),
    ).toEqual(apiOf(""));
  });
});

describe("next in the review desk", () => {
  it("is page 1, oldest first, with the desk's filters", () => {
    expect(
      nextInQueueParams(
        "?approval=all&person=a1&sort=weekKey&dir=desc&page=3&limit=50",
      ),
    ).toEqual({
      approval: "all",
      person: "a1",
      sort: "submittedAt",
      dir: "asc",
      page: 1,
      limit: 50,
    });
  });

  it("is the default desk when the reviewer didn't come from one", () => {
    expect(nextInQueueParams()).toEqual(apiOf(""));
    expect(nextInQueueParams(undefined)).toEqual(apiOf(""));
  });

  it("takes the first report that isn't the current one", () => {
    const items = [{ _id: "a" }, { _id: "b" }, { _id: "c" }];
    expect(firstOther(items, "a")).toEqual({ _id: "b" });
    expect(firstOther(items, "z")).toEqual({ _id: "a" });
    expect(firstOther([{ _id: "a" }], "a")).toBeNull();
    expect(firstOther([], "a")).toBeNull();
  });
});
