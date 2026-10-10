import { describe, expect, it } from "vitest";
import {
  addWeeks,
  addWorkingDays,
  holidaysWithin,
  nextWeekday,
  compareWeekKeys,
  currentWeekKey,
  isWeekKey,
  parseCalendarDate,
  toCalendarDate,
  weekDays,
  weekStartOf,
} from "../dates.js";
import { formatWeekLabel, formatWeekRange } from "../format.js";

describe("dates", () => {
  it("validates weekKeys, W53 only where it exists", () => {
    expect(isWeekKey("2026-W38")).toBe(true);
    expect(isWeekKey("2026-W53")).toBe(true); // 2026 has 53 ISO weeks
    expect(isWeekKey("2027-W53")).toBe(false);
    expect(isWeekKey("2026-W00")).toBe(false);
    expect(isWeekKey("2026-38")).toBe(false);
    expect(isWeekKey(null)).toBe(false);
  });

  it("finds Monday and the five working days as local dates", () => {
    expect(toCalendarDate(weekStartOf("2026-W38"))).toBe("2026-09-14");
    expect(
      weekDays("2026-W38").map((d) => [d.weekday, toCalendarDate(d.date)]),
    ).toEqual([
      ["mon", "2026-09-14"],
      ["tue", "2026-09-15"],
      ["wed", "2026-09-16"],
      ["thu", "2026-09-17"],
      ["fri", "2026-09-18"],
    ]);
  });

  it("steps across the ISO year boundary", () => {
    expect(addWeeks("2026-W53", 1)).toBe("2027-W01");
    expect(addWeeks("2027-W01", -1)).toBe("2026-W53");
    expect(compareWeekKeys("2026-W53", "2027-W01")).toBeLessThan(0);
  });

  it("reads the current week from the given clock", () => {
    expect(currentWeekKey(new Date(2026, 9, 4, 12))).toBe("2026-W40"); // Sunday 4 Oct
    expect(currentWeekKey(new Date(2026, 9, 5, 0, 1))).toBe("2026-W41");
  });

  it("parses a calendar date as local midnight", () => {
    const date = parseCalendarDate("2026-09-14");
    expect(date.getDate()).toBe(14);
    expect(date.getHours()).toBe(0);
    expect(parseCalendarDate("nonsense")).toBeNull();
  });

  it("formats week ranges", () => {
    expect(formatWeekRange("2026-W38")).toBe("14–18 Sep");
    expect(formatWeekRange("2026-W40")).toBe("28 Sep – 2 Oct");
    expect(formatWeekLabel("2026-W38")).toBe("W38 · 14–18 Sep");
  });
});

// The PlanModal's "Ends Fri 16 Oct" line: the start counts as day 1, as the server's
// count does (S3's done list: a 20-day plan from Monday 7 Sep ends Friday 2 Oct).
describe("addWorkingDays and holidaysWithin", () => {
  const start = parseCalendarDate("2026-09-07");

  it("ends a 20-day plan on the Friday four weeks on, counting the start as day 1", () => {
    expect(toCalendarDate(addWorkingDays(start, 20))).toBe("2026-10-02");
    expect(toCalendarDate(addWorkingDays(start, 1))).toBe("2026-09-07");
    expect(toCalendarDate(addWorkingDays(start, 6))).toBe("2026-09-14");
  });

  it("skips a holiday, which moves the end by a working day", () => {
    const holidays = new Set(["2026-09-08"]);
    expect(toCalendarDate(addWorkingDays(start, 20, holidays))).toBe(
      "2026-10-05",
    );
    expect(
      holidaysWithin(start, addWorkingDays(start, 20, holidays), holidays),
    ).toBe(1);
  });

  it("does not count a holiday on a weekend as skipped", () => {
    const holidays = new Set(["2026-09-12"]);
    const end = addWorkingDays(start, 20, holidays);
    expect(toCalendarDate(end)).toBe("2026-10-02");
    expect(holidaysWithin(start, end, holidays)).toBe(0);
  });

  it("returns null for inputs that make no date", () => {
    expect(addWorkingDays(start, 0)).toBeNull();
    expect(addWorkingDays(start, 2.5)).toBeNull();
    expect(addWorkingDays(null, 5)).toBeNull();
  });

  it("starts a new plan on the next weekday", () => {
    expect(nextWeekday(new Date(2026, 9, 3))).toBe("2026-10-05"); // Saturday
    expect(nextWeekday(new Date(2026, 9, 7))).toBe("2026-10-07"); // Wednesday
  });
});
