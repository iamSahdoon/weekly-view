import { describe, expect, it } from "vitest";
import { outcomeLine } from "../reviewOutcome.js";

// "Approved by Ruwan P. at 10:22" (design §3.6): the reviewer and time from the current
// version, the report's own last activity until that has loaded.

const NOW = new Date(2026, 9, 7, 12, 0);
const iso = (d, h, m) => new Date(2026, 9, d, h, m).toISOString();
const ruwan = { name: "Ruwan P." };

describe("the outcome of a review", () => {
  it("says who and when, as a time alone when it was today", () => {
    expect(
      outcomeLine(
        { status: "approved" },
        { reviewedBy: ruwan, reviewedAt: iso(7, 10, 22) },
        NOW,
      ),
    ).toBe("Approved by Ruwan P. at 10:22");
  });

  it("adds the date when it wasn't today", () => {
    expect(
      outcomeLine(
        { status: "needs_correction" },
        { reviewedBy: ruwan, reviewedAt: iso(2, 16, 5) },
        NOW,
      ),
    ).toBe("Sent back by Ruwan P. on 2 Oct at 16:05");
  });

  it("leaves the reviewer out until the version has loaded", () => {
    expect(
      outcomeLine(
        { status: "approved", lastActivityAt: iso(7, 9, 0) },
        null,
        NOW,
      ),
    ).toBe("Approved at 09:00");
    expect(outcomeLine({ status: "approved" }, null, NOW)).toBe("Approved");
  });

  it("has no outcome for a report nobody has reviewed", () => {
    expect(outcomeLine({ status: "submitted" }, null, NOW)).toBeNull();
    expect(outcomeLine({ status: "draft" }, null, NOW)).toBeNull();
  });
});
