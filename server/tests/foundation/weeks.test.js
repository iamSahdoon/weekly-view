import { describe, expect, it } from "vitest";
import { pageMeta, pageWindow } from "../../src/utils/paginate.js";
import {
  compareWeekKeys,
  isWeekKey,
  shiftWeek,
  toDateString,
  weekdayDate,
  weekdayOf,
  weekEndOf,
  weekKeyOf,
  weekStartOf,
} from "../../src/utils/weeks.js";

const d = (s) => new Date(`${s}T00:00:00.000Z`);

describe("weeks", () => {
  it("validates week keys, W53 only where the ISO year has one", () => {
    expect(isWeekKey("2026-W38")).toBe(true);
    expect(isWeekKey("2026-W53")).toBe(true); // 2026 starts on a Thursday
    expect(isWeekKey("2025-W53")).toBe(false);
    for (const bad of [
      "2026-W00",
      "2026-W54",
      "2026-W1",
      "2026W38",
      "26-W38",
      202638,
      null,
    ]) {
      expect(isWeekKey(bad)).toBe(false);
    }
  });

  it("resolves a week to Monday and Friday at UTC midnight", () => {
    expect(weekStartOf("2026-W38")).toEqual(d("2026-09-14"));
    expect(weekEndOf("2026-W38")).toEqual(d("2026-09-18"));
    expect(weekdayDate("2026-W38", "wed")).toEqual(d("2026-09-16"));
    expect(weekStartOf("2025-W01")).toEqual(d("2024-12-30"));
    expect(() => weekStartOf("2025-W53")).toThrow(RangeError);
  });

  it("finds the ISO week of a date across year boundaries", () => {
    expect(weekKeyOf(d("2026-09-14"))).toBe("2026-W38");
    expect(weekKeyOf(d("2026-09-20"))).toBe("2026-W38"); // Sunday
    expect(weekKeyOf(d("2024-12-30"))).toBe("2025-W01");
    expect(weekKeyOf(d("2027-01-01"))).toBe("2026-W53");
    expect(weekKeyOf(new Date("2026-09-13T23:59:59.999Z"))).toBe("2026-W37");
  });

  it("names weekdays, and nothing at the weekend", () => {
    expect(weekdayOf(d("2026-09-14"))).toBe("mon");
    expect(weekdayOf(d("2026-09-18"))).toBe("fri");
    expect(weekdayOf(d("2026-09-19"))).toBeNull();
  });

  it("shifts and orders weeks", () => {
    expect(shiftWeek("2026-W53", 1)).toBe("2027-W01");
    expect(shiftWeek("2026-W01", -1)).toBe("2025-W52");
    expect(compareWeekKeys("2026-W09", "2026-W10")).toBe(-1);
    expect(compareWeekKeys("2027-W01", "2026-W53")).toBe(1);
    expect(toDateString(weekStartOf("2026-W38"))).toBe("2026-09-14");
  });
});

describe("paginate", () => {
  it("builds the meta block, totalPages 0 when empty", () => {
    expect(pageMeta({ page: 1, limit: 20, total: 0 })).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
    expect(pageMeta({ page: 3, limit: 20, total: 41 })).toEqual({
      page: 3,
      limit: 20,
      total: 41,
      totalPages: 3,
    });
    expect(pageWindow({ page: 3, limit: 50 })).toEqual({
      skip: 100,
      limit: 50,
    });
  });
});
