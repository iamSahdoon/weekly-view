import { describe, expect, it } from "vitest";
import {
  buildReportScope,
  canCommentOnDay,
  canCommentOnWeek,
  canEditContent,
  canEditOwnComment,
  canOpenWeek,
  canReadContent,
  canResolveBlocker,
  canReviewReport,
  canToggleTeamComments,
  contentSourceFor,
  reviewDeskScope,
} from "../../src/policies/reportPolicy.js";

// api_specification.md §6.1 (1–8) — pure functions, no HTTP, no database.

const STATUSES = ["draft", "submitted", "needs_correction", "approved"];
const actor = (id, role) => ({ id, role, isOwner: false });

const memberX = actor("x", "member");
const memberY = actor("y", "member");
const managerA = actor("a", "manager");
const managerB = actor("b", "manager");
const admin = actor("d", "admin");

const reportOf = (author, status, extra = {}) => ({
  _id: "r",
  author,
  status,
  ...extra,
});

describe("1 · canOpenWeek", () => {
  it.each(STATUSES)("any active team member, %s → true", (status) => {
    for (const reader of [memberX, memberY, managerA, admin]) {
      expect(canOpenWeek(reader, reportOf("x", status))).toBe(true);
    }
  });
});

describe("2 · canReadContent", () => {
  it.each(STATUSES)("the author always (%s)", (status) => {
    expect(canReadContent(memberX, reportOf("x", status))).toBe(true);
    expect(canReadContent(managerA, reportOf("a", status))).toBe(true);
  });

  it("a manager or admin on another's: draft → false, every other status → true", () => {
    for (const reader of [managerA, admin]) {
      expect(canReadContent(reader, reportOf("x", "draft"))).toBe(false);
      for (const status of ["submitted", "needs_correction", "approved"])
        expect(canReadContent(reader, reportOf("x", status))).toBe(true);
    }
  });

  it.each(STATUSES)("a member on another's (%s) → false", (status) => {
    expect(canReadContent(memberY, reportOf("x", status))).toBe(false);
  });

  it("the served source: live for the author, the revision on needs_correction", () => {
    expect(contentSourceFor(memberX, reportOf("x", "needs_correction"))).toBe(
      "live",
    );
    expect(contentSourceFor(managerA, reportOf("x", "needs_correction"))).toBe(
      "revision",
    );
    expect(contentSourceFor(managerA, reportOf("x", "approved"))).toBe("live");
    expect(contentSourceFor(managerA, reportOf("x", "draft"))).toBe("withheld");
    expect(contentSourceFor(memberY, reportOf("x", "approved"))).toBe(
      "withheld",
    );
  });

  it("accepts a populated author", () => {
    expect(canReadContent(memberX, reportOf({ _id: "x" }, "draft"))).toBe(true);
  });
});

describe("3 · canCommentOnDay", () => {
  const closed = { openToTeam: false };
  const open = { openToTeam: true };

  it("the author → true", () => {
    expect(canCommentOnDay(memberX, reportOf("x", "draft"), closed)).toBe(true);
  });

  it("a manager or admin on anyone's, their own included → true", () => {
    expect(canCommentOnDay(managerA, reportOf("x", "draft"), closed)).toBe(
      true,
    );
    expect(canCommentOnDay(managerA, reportOf("a", "approved"), closed)).toBe(
      true,
    );
    expect(canCommentOnDay(admin, reportOf("x", "submitted"), closed)).toBe(
      true,
    );
  });

  it("a member on another's → false unless openToTeam", () => {
    expect(canCommentOnDay(memberY, reportOf("x", "draft"), closed)).toBe(
      false,
    );
    expect(canCommentOnDay(memberY, reportOf("x", "draft"), open)).toBe(true);
  });
});

describe("4 · canCommentOnWeek", () => {
  it("a manager on another's non-draft → true; on a draft → false", () => {
    for (const status of ["submitted", "needs_correction", "approved"])
      expect(canCommentOnWeek(managerA, reportOf("x", status))).toBe(true);
    expect(canCommentOnWeek(managerA, reportOf("x", "draft"))).toBe(false);
  });

  it("a member → false; the author never starts one", () => {
    expect(canCommentOnWeek(memberY, reportOf("x", "submitted"))).toBe(false);
    expect(canCommentOnWeek(memberX, reportOf("x", "submitted"))).toBe(false);
    expect(canCommentOnWeek(managerA, reportOf("a", "submitted"))).toBe(false);
  });
});

describe("5 · canReviewReport", () => {
  it("false for the author whatever the role", () => {
    for (const author of [memberX, managerA, admin])
      expect(canReviewReport(author, reportOf(author.id, "submitted"))).toBe(
        false,
      );
  });

  it("true for another manager on submitted, approval requested or not", () => {
    for (const approvalRequested of [true, false])
      expect(
        canReviewReport(
          managerB,
          reportOf("a", "submitted", { approvalRequested }),
        ),
      ).toBe(true);
  });

  it("false on any other status, and for a member", () => {
    for (const status of ["draft", "needs_correction", "approved"])
      expect(canReviewReport(managerB, reportOf("a", status))).toBe(false);
    expect(canReviewReport(memberY, reportOf("x", "submitted"))).toBe(false);
  });
});

describe("6 · canEditContent", () => {
  it("the author on draft or needs_correction only", () => {
    expect(canEditContent(memberX, reportOf("x", "draft"))).toBe(true);
    expect(canEditContent(memberX, reportOf("x", "needs_correction"))).toBe(
      true,
    );
    expect(canEditContent(memberX, reportOf("x", "submitted"))).toBe(false);
    expect(canEditContent(memberX, reportOf("x", "approved"))).toBe(false);
  });

  it("never anyone else", () => {
    for (const reader of [memberY, managerA, admin])
      expect(canEditContent(reader, reportOf("x", "draft"))).toBe(false);
  });
});

describe("7 · canResolveBlocker (and the team-comment switch)", () => {
  it.each(STATUSES)(
    "author, manager, admin at %s → true; a teammate → false",
    (status) => {
      const report = reportOf("x", status);
      for (const who of [memberX, managerA, admin]) {
        expect(canResolveBlocker(who, report)).toBe(true);
        expect(canToggleTeamComments(who, report)).toBe(true);
      }
      expect(canResolveBlocker(memberY, report)).toBe(false);
      expect(canToggleTeamComments(memberY, report)).toBe(false);
    },
  );
});

describe("8 · canEditOwnComment", () => {
  const createdAt = new Date("2026-09-16T18:05:00.000Z");
  const comment = { author: "x", createdAt };
  const after = (ms) => new Date(createdAt.getTime() + ms);

  it("the writer at 9:59 → true; at 10:01 → false", () => {
    expect(canEditOwnComment(memberX, comment, after(599_000))).toBe(true);
    expect(canEditOwnComment(memberX, comment, after(601_000))).toBe(false);
  });

  it("anyone else → false", () => {
    for (const reader of [memberY, managerA, admin])
      expect(canEditOwnComment(reader, comment, after(1000))).toBe(false);
  });
});

describe("buildReportScope", () => {
  it("members are scoped to themselves; managers and admins to the team", () => {
    expect(buildReportScope(memberX, { status: "draft" })).toEqual({
      status: "draft",
      author: "x",
    });
    expect(buildReportScope(memberX, { author: "y" })).toEqual({ author: "x" });
    expect(buildReportScope(managerA, { status: "submitted" })).toEqual({
      status: "submitted",
    });
  });
});

describe("reviewDeskScope", () => {
  it("submitted, asked for approval unless all, never the actor's own", () => {
    expect(reviewDeskScope(managerA)).toEqual({
      $and: [
        {},
        { status: "submitted" },
        { approvalRequested: true },
        { author: { $ne: "a" } },
      ],
    });
    expect(reviewDeskScope(admin, { approval: "all" }).$and).toEqual([
      {},
      { status: "submitted" },
      {},
      { author: { $ne: "d" } },
    ]);
  });
});
