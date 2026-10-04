import { WEEKDAYS } from "../constants/weekdays.js";
import { Holiday } from "../models/holidayModel.js";
import {
  toDateString,
  weekEndOf,
  weekStartOf,
  weekdayDate,
} from "../utils/weeks.js";

// The one place working days are computed (project_structure.md §2.5): weeks × holidays ×
// work periods × leave (database_schema.md §0.2, §5.0). Calendar dates are Dates at UTC
// midnight and are compared as "YYYY-MM-DD" strings. The pure functions take the holiday
// set as an argument; the async ones read `holidays` and nothing else.

const DAY = 24 * 60 * 60 * 1000;

const utcMidnight = (date) =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

/** Today's calendar date on the server's clock, UTC midnight. */
export function todayUtc(now = new Date()) {
  return utcMidnight(now);
}

/** Holiday dates in [from, to], inclusive, as a Set of "YYYY-MM-DD". */
export async function holidaySet(from, to) {
  const rows = await Holiday.find({
    date: { $gte: utcMidnight(from), $lte: utcMidnight(to) },
  })
    .select("date")
    .lean();
  return new Set(rows.map((h) => toDateString(h.date)));
}

// ---------------------------------------------------------------- working days

const isWeekdayUtc = (date) => date.getUTCDay() >= 1 && date.getUTCDay() <= 5;

/** Mondays to Fridays in [from, to], inclusive, ignoring holidays. */
function weekdaysBetween(from, to) {
  const days = Math.round((to - from) / DAY) + 1;
  if (days <= 0) return 0;
  const fullWeeks = Math.floor(days / 7);
  let count = fullWeeks * 5;
  for (let i = fullWeeks * 7; i < days; i += 1) {
    if (isWeekdayUtc(new Date(from.getTime() + i * DAY))) count += 1;
  }
  return count;
}

/** Working days in [from, to], inclusive: weekdays not in `holidays`. Pure. */
export function countWorkingDays(from, to, holidays) {
  const start = utcMidnight(from);
  const end = utcMidnight(to);
  if (end < start) return 0;
  const startKey = toDateString(start);
  const endKey = toDateString(end);
  let onHolidays = 0;
  for (const key of holidays) {
    // Holidays are weekdays by schema, so each one in range removes one working day.
    if (key >= startKey && key <= endKey) onHolidays += 1;
  }
  return weekdaysBetween(start, end) - onHolidays;
}

/** The week's working days, Mon–Fri minus holidays, as weekdays ("mon"…"fri"). Pure. */
export function workingDaysIn(weekKey, holidays) {
  return WEEKDAYS.filter(
    (day) => !holidays.has(toDateString(weekdayDate(weekKey, day))),
  );
}

/** The week's working days, reading `holidays`. */
export async function workingDaysOfWeek(weekKey) {
  const holidays = await holidaySet(weekStartOf(weekKey), weekEndOf(weekKey));
  return workingDaysIn(weekKey, holidays);
}

// ---------------------------------------------------------------- people

const dateKey = (date) => toDateString(utcMidnight(date));

// A period covers a day from `from`'s date up to, not including, `to`'s date: the day
// leave is switched on is the first day away, the day it is switched off the first day
// back (database_schema.md §5.0).
const covers = (period, dayKey) =>
  dateKey(period.from) <= dayKey &&
  (period.to == null || dayKey < dateKey(period.to));

/**
 * §5.0 stage 1: one of the person's work periods covers the week — `from ≤ weekEnd` and
 * `to` open or after weekEnd. Removed during the week → not expected; joined → expected.
 */
export function isOnTeamForWeek(user, weekKey) {
  const weekEnd = weekEndOf(weekKey);
  return (user.workPeriods ?? []).some(
    (p) => p.from <= weekEnd && (p.to == null || p.to > weekEnd),
  );
}

/**
 * The person's expected days in the week (database_schema.md §0.2): working days on which
 * a work period covers them and no leave period does. Empty when they aren't on the team
 * that week. Pure.
 */
export function expectedDaysOf(user, weekKey, workingDays) {
  if (!isOnTeamForWeek(user, weekKey)) return [];
  return workingDays.filter((day) => {
    const key = toDateString(weekdayDate(weekKey, day));
    return (
      (user.workPeriods ?? []).some((p) => covers(p, key)) &&
      !(user.leave ?? []).some((p) => covers(p, key))
    );
  });
}

/**
 * Why a weekday is or isn't one of the person's expected days: `expected`, `holiday`,
 * `not_on_team` (no work period covers it) or `leave`, checked in that order — the same
 * rule as expectedDaysOf. Pure.
 */
export function dayAvailability(user, weekKey, weekday, holidays) {
  const key = toDateString(weekdayDate(weekKey, weekday));
  if (holidays.has(key)) return "holiday";
  if (
    !isOnTeamForWeek(user, weekKey) ||
    !(user.workPeriods ?? []).some((p) => covers(p, key))
  )
    return "not_on_team";
  if ((user.leave ?? []).some((p) => covers(p, key))) return "leave";
  return "expected";
}

/**
 * The derived week state (database_schema.md §5.0): a report submitted at least once
 * keeps its status; then `holiday_week`, `on_leave`, `draft` and `not_started`. `report`
 * is `{ status }` or null. Pure.
 */
export function weekStateOf({ workingDays, expectedDays, report }) {
  if (report && report.status !== "draft") return report.status;
  if (workingDays.length === 0) return "holiday_week";
  if (expectedDays.length === 0) return "on_leave";
  return report ? report.status : "not_started";
}

// ---------------------------------------------------------------- projects

/**
 * Days used by a plan (database_schema.md §5.3): working days from `startDate` to `today`,
 * inclusive, skipping holidays; zero while the start is in the future. Pure.
 */
export function planDaysUsed(plan, today, holidays) {
  return countWorkingDays(plan.startDate, today, holidays);
}

/** Holidays covering every plan in `plans` up to `today`, in one query. */
export async function holidaysForPlans(plans, today) {
  if (plans.length === 0) return new Set();
  const earliest = new Date(Math.min(...plans.map((p) => p.startDate)));
  return earliest > today ? new Set() : holidaySet(earliest, today);
}
