import { describe, expect, it } from "vitest";
import {
  DASHBOARD_SPEC,
  dashboardParams,
  pageFilterCount,
  personWeekHref,
} from "../dashboardParams.js";
import { parseParams } from "../urlParams.js";

// The dashboard's URL state and what each block asks for (frontend_architecture.md §9.8).

const A = "0000000000000000000000a1";
const B = "0000000000000000000000b2";
const P = "0000000000000000000000c3";
const WEEK = "2026-W40";
const parse = (query = "") =>
  parseParams(DASHBOARD_SPEC, new URLSearchParams(query));

describe("reading the address", () => {
  it("defaults to name order, an eight-week trend and progress in days", () => {
    expect(parse()).toMatchObject({
      person: [],
      project: "",
      status: [],
      page: 1,
      limit: 20,
      sort: "name",
      dir: "asc",
      trendWeeks: "8",
      trendPerson: "",
      unit: "days",
    });
  });

  it("reads every parameter, and a hand-edited value falls back to the default", () => {
    const filters = parse(
      `person=${A},${B}&project=${P}&status=draft,approved&sort=status&dir=desc&trendWeeks=12&trendPerson=${A}&unit=hours&page=3&limit=50`,
    );
    expect(filters).toMatchObject({
      person: [A, B],
      project: P,
      status: ["draft", "approved"],
      sort: "status",
      dir: "desc",
      trendWeeks: "12",
      trendPerson: A,
      unit: "hours",
      page: 3,
      limit: 50,
    });
    expect(
      parse("trendWeeks=7&sort=hours&unit=weeks&status=nope"),
    ).toMatchObject({
      trendWeeks: "8",
      sort: "name",
      unit: "days",
      status: [],
    });
  });

  it("knows the three week states and the four statuses, and no other", () => {
    expect(
      parse(
        "status=not_started,on_leave,holiday_week,draft,submitted,needs_correction,approved",
      ).status,
    ).toHaveLength(7);
  });
});

describe("what each block asks for", () => {
  const filters = parse(
    `person=${A},${B}&project=${P}&status=submitted&sort=lastActivityAt&dir=desc&page=2&limit=50&trendWeeks=4&trendPerson=${B}`,
  );
  const params = dashboardParams(filters, WEEK);

  it("sends `status` to the team table and to nothing else", () => {
    expect(params.team.status).toBe("submitted");
    for (const block of ["summary", "projects", "trend", "hours", "workload"]) {
      expect(params[block]).not.toHaveProperty("status");
    }
  });

  it("D1, D4 and D5 take the week, person and project — no paging, no sort", () => {
    const shared = { weekKey: WEEK, person: `${A},${B}`, project: P };
    expect(params.summary).toEqual(shared);
    expect(params.hours).toEqual(shared);
    expect(params.workload).toEqual(shared);
  });

  it("D2 adds the status, the page, the limit and the sort", () => {
    expect(params.team).toEqual({
      weekKey: WEEK,
      person: `${A},${B}`,
      project: P,
      status: "submitted",
      page: 2,
      limit: 50,
      sort: "lastActivityAt",
      dir: "desc",
    });
  });

  it("D3 ends at the week and takes the window and the person to compare", () => {
    expect(params.trend).toEqual({
      endWeek: WEEK,
      weeks: 4,
      person: `${A},${B}`,
      project: P,
      trendPerson: B,
    });
  });

  it("D8 takes the week and nothing else: it is not filtered by person or project", () => {
    expect(params.projects).toEqual({ weekKey: WEEK });
  });

  it("leaves out what is not set, so equal views share a query key", () => {
    const bare = dashboardParams(parse(), WEEK);
    expect(bare.summary).toEqual({ weekKey: WEEK });
    expect(bare.trend).toEqual({ endWeek: WEEK, weeks: 8 });
    expect(bare.team).toEqual({
      weekKey: WEEK,
      page: 1,
      limit: 20,
      sort: "name",
      dir: "asc",
    });
  });

  it("drops an id that isn't one, rather than sending the server a 422", () => {
    const bad = dashboardParams(
      parse(`person=nobody,${A}&project=x&trendPerson=y`),
      WEEK,
    );
    expect(bad.summary).toEqual({ weekKey: WEEK, person: A });
    expect(bad.trend).not.toHaveProperty("trendPerson");
  });
});

describe("the page-level filter count", () => {
  it("counts person and project, and nothing the blocks own", () => {
    expect(pageFilterCount(parse())).toBe(0);
    expect(pageFilterCount(parse(`person=${A},${B}`))).toBe(1);
    expect(pageFilterCount(parse(`person=${A}&project=${P}`))).toBe(2);
    expect(
      pageFilterCount(
        parse("status=draft&trendWeeks=12&unit=hours&sort=status"),
      ),
    ).toBe(0);
    expect(pageFilterCount(parse("project=not-an-id"))).toBe(0);
  });
});

describe("a person's week", () => {
  it("is your own at /reports, someone else's under /people", () => {
    expect(personWeekHref(A, A, WEEK)).toBe(`/reports/${WEEK}`);
    expect(personWeekHref(B, A, WEEK)).toBe(`/people/${B}/reports/${WEEK}`);
  });
});
