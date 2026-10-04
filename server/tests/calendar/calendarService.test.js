import { beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { Holiday } from "../../src/models/holidayModel.js";
import {
  countWorkingDays,
  expectedDaysOf,
  holidaySet,
  isOnTeamForWeek,
  planDaysUsed,
  todayUtc,
  weekStateOf,
  workingDaysOfWeek,
} from "../../src/services/calendarService.js";
import { clearDb } from "../helpers/testDb.js";

// calendarService: working days, expected days, week state, project days used
// (database_schema.md §0.2, §5.0, §5.3).

const d = (s) => new Date(`${s}T00:00:00.000Z`);
const at = (s) => new Date(s);
const none = new Set();
const admin = new mongoose.Types.ObjectId();
const ALL = ["mon", "tue", "wed", "thu", "fri"];

// 2026-W37 runs Mon 7 Sep – Fri 11 Sep 2026.
const W37 = "2026-W37";

beforeEach(clearDb);

describe("working days", () => {
  it("counts weekdays inclusively and skips weekends", () => {
    expect(countWorkingDays(d("2026-09-07"), d("2026-09-07"), none)).toBe(1);
    expect(countWorkingDays(d("2026-09-07"), d("2026-09-11"), none)).toBe(5);
    expect(countWorkingDays(d("2026-09-07"), d("2026-09-13"), none)).toBe(5);
    expect(countWorkingDays(d("2026-09-05"), d("2026-09-06"), none)).toBe(0);
    expect(countWorkingDays(d("2026-09-07"), d("2026-10-02"), none)).toBe(20);
    expect(countWorkingDays(d("2026-09-07"), d("2026-09-04"), none)).toBe(0);
  });

  it("skips holidays in range only", () => {
    const holidays = new Set(["2026-09-08", "2026-12-25"]);
    expect(countWorkingDays(d("2026-09-07"), d("2026-09-11"), holidays)).toBe(
      4,
    );
    expect(countWorkingDays(d("2026-09-09"), d("2026-09-11"), holidays)).toBe(
      3,
    );
  });

  it("ignores the time of day on either end", () => {
    expect(
      countWorkingDays(
        at("2026-09-07T23:59:00Z"),
        at("2026-09-08T00:01:00Z"),
        none,
      ),
    ).toBe(2);
  });

  it("reads a week's working days from holidays", async () => {
    expect(await workingDaysOfWeek(W37)).toEqual(ALL);
    await Holiday.create({
      date: d("2026-09-09"),
      name: "Poya",
      createdBy: admin,
    });
    expect(await workingDaysOfWeek(W37)).toEqual(["mon", "tue", "thu", "fri"]);
    expect(await holidaySet(d("2026-09-01"), d("2026-09-30"))).toEqual(
      new Set(["2026-09-09"]),
    );
  });

  it("todayUtc is the UTC calendar date", () => {
    expect(todayUtc(at("2026-09-07T23:30:00Z"))).toEqual(d("2026-09-07"));
  });
});

describe("expected days and week state (§5.0)", () => {
  const person = (overrides = {}) => ({
    workPeriods: [{ from: at("2026-01-05T09:00:00Z"), to: null }],
    leave: [],
    ...overrides,
  });

  it("everyone on the team is expected on every working day", () => {
    expect(expectedDaysOf(person(), W37, ALL)).toEqual(ALL);
    expect(expectedDaysOf(person(), W37, ["mon", "fri"])).toEqual([
      "mon",
      "fri",
    ]);
  });

  it("leave: the day it is switched on is away, the day it is switched off is back", () => {
    const p = person({
      leave: [
        { from: at("2026-09-08T15:00:00Z"), to: at("2026-09-10T08:00:00Z") },
      ],
    });
    expect(expectedDaysOf(p, W37, ALL)).toEqual(["mon", "thu", "fri"]);
  });

  it("open leave covers the rest of the week", () => {
    const p = person({
      leave: [{ from: at("2026-09-07T10:00:00Z"), to: null }],
    });
    expect(expectedDaysOf(p, W37, ALL)).toEqual([]);
  });

  it("removed during the week → not on the team that week", () => {
    const p = person({
      workPeriods: [
        { from: at("2026-01-05T09:00:00Z"), to: at("2026-09-09T12:00:00Z") },
      ],
    });
    expect(isOnTeamForWeek(p, W37)).toBe(false);
    expect(expectedDaysOf(p, W37, ALL)).toEqual([]);
    expect(isOnTeamForWeek(p, "2026-W36")).toBe(true);
  });

  it("joined during the week → on the team, expected from the day they joined", () => {
    const p = person({
      workPeriods: [{ from: at("2026-09-09T12:00:00Z"), to: null }],
    });
    expect(isOnTeamForWeek(p, W37)).toBe(true);
    expect(expectedDaysOf(p, W37, ALL)).toEqual(["wed", "thu", "fri"]);
    expect(isOnTeamForWeek(p, "2026-W36")).toBe(false);
  });

  it("weeks between two work periods are not expected", () => {
    const p = person({
      workPeriods: [
        { from: at("2026-01-05T09:00:00Z"), to: at("2026-08-01T00:00:00Z") },
        { from: at("2026-09-21T09:00:00Z"), to: null },
      ],
    });
    expect(isOnTeamForWeek(p, W37)).toBe(false);
    expect(isOnTeamForWeek(p, "2026-W39")).toBe(true);
  });

  it("derives the week state in the documented order", () => {
    const state = (workingDays, expectedDays, report = null) =>
      weekStateOf({ workingDays, expectedDays, report });
    expect(state([], [])).toBe("holiday_week");
    expect(state(ALL, [])).toBe("on_leave");
    expect(state(ALL, ALL)).toBe("not_started");
    expect(state(ALL, ALL, { status: "draft" })).toBe("draft");
    expect(state(ALL, [], { status: "draft" })).toBe("on_leave");
    // A report submitted at least once keeps its status, whatever the calendar says.
    expect(state([], [], { status: "submitted" })).toBe("submitted");
    expect(state(ALL, [], { status: "approved" })).toBe("approved");
    expect(state(ALL, ALL, { status: "needs_correction" })).toBe(
      "needs_correction",
    );
  });
});

describe("project days used (§5.3)", () => {
  const plan = { startDate: d("2026-09-07"), plannedDays: 20 };

  it("counts from the start date to today inclusive", () => {
    expect(planDaysUsed(plan, d("2026-09-07"), none)).toBe(1);
    expect(planDaysUsed(plan, d("2026-09-08"), none)).toBe(2);
    expect(planDaysUsed(plan, d("2026-10-02"), none)).toBe(20);
    expect(planDaysUsed(plan, d("2026-10-05"), none)).toBe(21);
  });

  it("is zero while the start is in the future", () => {
    expect(planDaysUsed(plan, d("2026-09-04"), none)).toBe(0);
  });

  it("skips holidays", () => {
    expect(planDaysUsed(plan, d("2026-09-08"), new Set(["2026-09-08"]))).toBe(
      1,
    );
  });
});
