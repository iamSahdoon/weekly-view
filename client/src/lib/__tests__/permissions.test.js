import { describe, expect, it } from "vitest";
import { minutesLeft, revisionOutcome } from "../format.js";
import {
  canEditReport,
  canResolveBlocker,
  emailChangeHint,
  userActions,
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

// The Users page's row rules (requirments_doc.md §11.2–§11.3): admins act on members and
// managers, only the owner on admins, nobody on the owner, no one on themselves.
describe("userActions", () => {
  const user = (_id, role, extra = {}) => ({
    _id,
    role,
    status: "active",
    isOwner: false,
    onLeave: false,
    ...extra,
  });
  const owner = user("owner", "admin", { isOwner: true });
  const admin = user("admin", "admin");
  const member = user("member", "member");
  const manager = user("manager", "manager");
  const allowed = (gates) =>
    Object.fromEntries(
      Object.entries(gates).map(([name, gate]) => [name, gate.allowed]),
    );

  it("lets an admin act on a member in full, except passing ownership on", () => {
    expect(allowed(userActions(admin, member))).toEqual({
      canChangeRole: true,
      canEditEmail: true,
      canResetPassword: true,
      canRemove: true,
      canMakeOwner: false,
      canToggleLeave: true,
      canReissue: false,
    });
    expect(userActions(admin, manager).canRemove.allowed).toBe(true);
  });

  it("keeps another admin's details to the owner", () => {
    const gates = userActions(admin, user("other", "admin"));
    for (const name of [
      "canChangeRole",
      "canEditEmail",
      "canResetPassword",
      "canRemove",
    ]) {
      expect(gates[name].allowed).toBe(false);
      expect(gates[name].reason).toBe(
        "Only the owner can change another admin's details.",
      );
    }
    const asOwner = userActions(owner, user("other", "admin"));
    expect(asOwner.canChangeRole.allowed).toBe(true);
    expect(asOwner.canEditEmail.allowed).toBe(true);
    expect(asOwner.canRemove.allowed).toBe(true);
  });

  it("protects the owner from every other admin", () => {
    const gates = userActions(admin, owner);
    for (const name of [
      "canChangeRole",
      "canEditEmail",
      "canResetPassword",
      "canRemove",
    ]) {
      expect(gates[name]).toEqual({
        allowed: false,
        reason: "The owner can't be changed by other admins.",
      });
    }
  });

  it("lets nobody change their own role or remove themselves", () => {
    for (const me of [admin, owner]) {
      const gates = userActions(me, me);
      expect(gates.canChangeRole).toEqual({
        allowed: false,
        reason: "You can't change your own role.",
      });
      expect(gates.canRemove.allowed).toBe(false);
    }
  });

  it("lets the owner change their own email, and no other admin", () => {
    expect(userActions(owner, owner).canEditEmail.allowed).toBe(true);
    expect(userActions(admin, admin).canEditEmail.allowed).toBe(false);
    expect(userActions(admin, admin).canResetPassword.allowed).toBe(false);
  });

  it("offers Make owner to the owner alone, for an active manager or admin", () => {
    expect(userActions(owner, manager).canMakeOwner.allowed).toBe(true);
    expect(
      userActions(owner, user("other", "admin")).canMakeOwner.allowed,
    ).toBe(true);
    expect(userActions(owner, member).canMakeOwner.allowed).toBe(false);
    expect(userActions(owner, owner).canMakeOwner.allowed).toBe(false);
    expect(
      userActions(owner, user("gone", "manager", { status: "invited" }))
        .canMakeOwner.allowed,
    ).toBe(false);
    expect(userActions(admin, manager).canMakeOwner.allowed).toBe(false);
  });

  it("re-issues only an invite, and sets leave only for an active person", () => {
    const invited = user("invited", "member", { status: "invited" });
    expect(userActions(admin, invited).canReissue.allowed).toBe(true);
    expect(userActions(admin, invited).canToggleLeave.allowed).toBe(false);
    expect(userActions(admin, invited).canResetPassword.allowed).toBe(false);
    expect(userActions(admin, member).canReissue.allowed).toBe(false);
  });

  it("disables every control on a removed person", () => {
    const gone = user("gone", "member", { status: "removed" });
    const gates = allowed(userActions(admin, gone));
    expect(Object.values(gates).every((v) => v === false)).toBe(true);
  });
});

describe("emailChangeHint (design §3.11)", () => {
  const owner = { name: "Sanduni B.", email: "sanduni@example.com" };
  it("tells the owner to use the Users page", () => {
    expect(emailChangeHint({ isOwner: true, role: "admin", owner })).toEqual({
      kind: "owner",
    });
  });
  it("sends an admin to the owner alone, a member or manager to the owner or any admin", () => {
    const admin = emailChangeHint({ isOwner: false, role: "admin", owner });
    expect(admin.kind).toBe("admin");
    expect(emailChangeHint({ role: "member", owner }).kind).toBe("other");
    expect(emailChangeHint({ role: "manager", owner }).kind).toBe("other");
  });
  it("addresses the mailto: to the owner with the request subject", () => {
    const hint = emailChangeHint({ role: "member", owner });
    expect(hint.mailto).toBe(
      "mailto:sanduni@example.com?subject=Email%20change%20request",
    );
    expect(hint.ownerEmail).toBe("sanduni@example.com");
  });
});
