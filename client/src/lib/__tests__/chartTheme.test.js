import { describe, expect, it } from "vitest";
import * as theme from "../chartTheme.js";
import { TASK_TYPES, TASK_TYPE_COLORS } from "../constants.js";

// frontend_architecture.md §10, design §7.3: the charts are configured in one place, in
// tokens, and the seven task types wear the same colours everywhere.

const strings = (value) =>
  typeof value === "string"
    ? [value]
    : value && typeof value === "object"
      ? Object.values(value).flatMap(strings)
      : [];

describe("chartTheme", () => {
  it("has no hex value anywhere: every colour is a var(--token)", () => {
    for (const [name, value] of Object.entries(theme)) {
      for (const text of strings(value)) {
        expect(text, `${name}: ${text}`).not.toMatch(/#[0-9a-f]{3,8}\b/i);
        expect(text, `${name}: ${text}`).not.toMatch(/\b(rgb|hsl)a?\(/i);
      }
    }
    for (const value of [
      ...Object.values(theme.typeColor),
      ...Object.values(theme.seriesColor),
      theme.gridProps.stroke,
      theme.tickProps.fill,
      theme.labelTickProps.fill,
      theme.axisLineProps.stroke,
      theme.cursorProps.stroke,
      theme.barCursorProps.fill,
    ]) {
      expect(value).toMatch(/^var\(--[a-z0-9-]+\)$/);
    }
  });

  it("gives the seven task types the day panel's and the form's colours", () => {
    expect(theme.typeColor).toBe(TASK_TYPE_COLORS);
    expect(Object.keys(theme.typeColor).sort()).toEqual([...TASK_TYPES].sort());
    expect(theme.typeColor).toEqual({
      development: "var(--c1)",
      testing: "var(--c2)",
      meetings: "var(--c3)",
      documentation: "var(--c4)",
      review: "var(--c5)",
      research_study: "var(--c7)",
      other: "var(--c6)",
    });
  });

  it("draws horizontal gridlines only, and the ticks in mono", () => {
    expect(theme.gridProps.vertical).toBe(false);
    expect(theme.tickProps.fontFamily).toBe("var(--font-mono)");
    expect(theme.tickProps.fontSize).toBe(11);
  });

  it("fixes the heights: 260 for the trend, 240 for the bars", () => {
    expect(theme.TREND_HEIGHT).toBe(260);
    expect(theme.BARS_HEIGHT).toBe(240);
  });

  it("limits the axes: four Y ticks, bars no wider than 28px, a 320 ms transition", () => {
    expect(theme.MAX_Y_TICKS).toBe(4);
    expect(theme.MAX_BAR).toBe(28);
    expect(theme.ANIMATION_MS).toBe(320);
  });
});
