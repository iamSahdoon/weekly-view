import { describe, expect, it } from "vitest";
import { endLeaveCopy } from "../format.js";

// Ending leave asks first (owner decision, C4) — for yourself, and for a manager or
// admin ending someone else's.

describe("endLeaveCopy", () => {
  it("yourself: today will need a daily update", () => {
    expect(endLeaveCopy({ name: "Dinesh K." }, true)).toEqual({
      title: "Turn off your leave?",
      body: "Today will need a daily update.",
      confirmLabel: "Turn off leave",
    });
  });

  it("someone else: named by first name", () => {
    expect(endLeaveCopy({ name: "Dinesh K." }, false)).toEqual({
      title: "Turn off Dinesh’s leave?",
      body: "Dinesh will need a daily update for today.",
      confirmLabel: "Turn off leave",
    });
  });
});
