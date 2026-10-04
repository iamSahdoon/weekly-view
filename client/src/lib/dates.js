import {
  addDays,
  addWeeks as addWeeksToDate,
  format,
  getISOWeek,
  getISOWeekYear,
  isValid,
  parseISO,
  setISOWeek,
  startOfISOWeek,
} from "date-fns";
import { WEEKDAYS } from "./constants.js";

// ISO-week helpers (frontend_architecture.md §5.3). A weekKey becomes dates only
// here — never by string arithmetic. All dates are local calendar days: the
// browser's clock defines "today" (api_specification.md I2).

const WEEK_KEY = /^(\d{4})-W(0[1-9]|[1-4]\d|5[0-3])$/;

export function isWeekKey(value) {
  if (typeof value !== "string") return false;
  const match = WEEK_KEY.exec(value);
  if (!match) return false;
  // W53 exists only in years that have one.
  return weekKeyOf(mondayOf(Number(match[1]), Number(match[2]))) === value;
}

function mondayOf(isoYear, week) {
  // 4 January is always in ISO week 1 of its year.
  const jan4 = new Date(isoYear, 0, 4);
  return startOfISOWeek(setISOWeek(jan4, week));
}

export function weekKeyOf(date) {
  const week = String(getISOWeek(date)).padStart(2, "0");
  return `${getISOWeekYear(date)}-W${week}`;
}

export function currentWeekKey(now = new Date()) {
  return weekKeyOf(now);
}

/** The Monday of the week, at local midnight. */
export function weekStartOf(weekKey) {
  const match = WEEK_KEY.exec(weekKey);
  if (!match) throw new RangeError(`Not a weekKey: ${weekKey}`);
  return mondayOf(Number(match[1]), Number(match[2]));
}

/** The five working days, Monday to Friday, as { weekday, date }. */
export function weekDays(weekKey) {
  const monday = weekStartOf(weekKey);
  return WEEKDAYS.map((weekday, i) => ({ weekday, date: addDays(monday, i) }));
}

export function addWeeks(weekKey, n) {
  return weekKeyOf(addWeeksToDate(weekStartOf(weekKey), n));
}

/** Negative, zero or positive, like a sort comparator. */
export function compareWeekKeys(a, b) {
  return weekStartOf(a).getTime() - weekStartOf(b).getTime();
}

/** "W38" — the short form shown in mono (design §0.5). */
export function weekNumberLabel(weekKey) {
  return weekKey.slice(5);
}

/** A YYYY-MM-DD calendar date → a local Date. Never `new Date("2026-09-14")`. */
export function parseCalendarDate(value) {
  const date = parseISO(value);
  return isValid(date) ? date : null;
}

/** A local Date → YYYY-MM-DD. */
export function toCalendarDate(date) {
  return format(date, "yyyy-MM-dd");
}

/** "mon"…"fri" for a weekday date, null for a weekend. */
export function weekdayOf(date) {
  const index = (date.getDay() + 6) % 7;
  return WEEKDAYS[index] ?? null;
}
