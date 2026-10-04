import { describe, expect, it } from "vitest";
import { minutesLeft, revisionOutcome } from "../format.js";
import {
  canEditReport,
  canResolveBlocker,
  weekThreadAccess,
} from "../permissions.js";

const person = (_id, role) => ({ _id, role });
const report = (status, authorId = "a", weekComments = []) => ({
  status,
  author: { _id: authorId },
  weekComments,
});

describe("weekThreadAccess (G1 — derived on the client)", () => {
  it("lets a manager who isn't the author start a thread on a submitted report", () => {
    expect(
      weekThreadAccess(person("m", "manager"), report("submitted")),
    ).toEqual({
      canStart: true,
      canReply: true,
    });
  });

  it("never lets anyone start a thread on a Draft, or on their own report", () => {
    expect(
      weekThreadAccess(person("m", "manager"), report("draft")).canStart,
    ).toBe(false);
    expect(
      weekThreadAccess(person("m", "manager"), report("submitted", "m"))
        .canStart,
    ).toBe(false);
    expect(
      weekThreadAccess(person("x", "member"), report("submitted")).canStart,
    ).toBe(false);
  });

  it("lets the author reply but not start", () => {
    expect(weekThreadAccess(person("a", "member"), report("approved"))).toEqual(
      {
        canStart: false,
        canReply: true,
      },
    );
  });

  it("offers a teammate nothing — and nothing is served to them anyway", () => {
    expect(
      weekThreadAccess(person("x", "member"), report("approved", "a", null)),
    ).toEqual({ canStart: false, canReply: false });
  });
});

describe("the other gates", () => {
  it("resolves blockers for the author and managers, not teammates", () => {
    expect(canResolveBlocker(person("a", "member"), report("draft"))).toBe(
      true,
    );
    expect(canResolveBlocker(person("m", "admin"), report("draft"))).toBe(true);
    expect(canResolveBlocker(person("x", "member"), report("draft"))).toBe(
      false,
    );
  });

  it("offers Edit report to the author on a Draft or Needs correction only", () => {
    const me = person("a", "member");
    expect(canEditReport(me, report("draft"))).toBe(true);
    expect(canEditReport(me, report("needs_correction"))).toBe(true);
    expect(canEditReport(me, report("submitted"))).toBe(false);
    expect(canEditReport(me, report("approved"))).toBe(false);
    expect(canEditReport(person("m", "manager"), report("draft"))).toBe(false);
  });
});

describe("comment window and version labels", () => {
  const until = "2026-09-16T18:15:00.000Z";
  const at = (iso) => new Date(iso).getTime();

  it("counts whole minutes up, so the label never reads 0 while buttons show", () => {
    expect(minutesLeft(until, at("2026-09-16T18:05:00.000Z"))).toBe(10);
    expect(minutesLeft(until, at("2026-09-16T18:14:30.000Z"))).toBe(1);
  });

  it("is 0 from the moment the window ends", () => {
    expect(minutesLeft(until, at(until))).toBe(0);
    expect(minutesLeft(until, at("2026-09-16T19:00:00.000Z"))).toBe(0);
  });

  it("names a version's outcome", () => {
    expect(revisionOutcome({ action: "changes_requested" })).toBe("sent back");
    expect(revisionOutcome({ action: "approved" })).toBe("approved");
    expect(revisionOutcome({ action: null })).toBe("submitted");
  });
});
