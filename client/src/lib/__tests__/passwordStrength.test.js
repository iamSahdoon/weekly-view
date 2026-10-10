import { describe, expect, it } from "vitest";
import { passwordStrength } from "../passwordStrength.js";

describe("passwordStrength", () => {
  it("is empty with nothing typed and asks for 8 characters below that", () => {
    expect(passwordStrength("")).toEqual({ score: 0, label: "" });
    expect(passwordStrength("abc123")).toEqual({
      score: 0,
      label: "Use at least 8 characters.",
    });
  });
  it("rewards length first and variety second", () => {
    expect(passwordStrength("abcdefgh").score).toBe(1);
    expect(passwordStrength("abcdefghijkl").score).toBe(2);
    expect(passwordStrength("Abcdef12!").score).toBe(2);
    expect(passwordStrength("Abcdefghij12!").score).toBe(3);
    expect(passwordStrength("correct horse battery staple").score).toBe(3);
    expect(passwordStrength("Correct-Horse-Battery-9").score).toBe(4);
  });
  it("never exceeds 4", () => {
    expect(passwordStrength("Aa1!".repeat(30)).score).toBe(4);
  });
});
