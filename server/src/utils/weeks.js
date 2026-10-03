import {
  addDays,
  addWeeks,
  getISOWeek,
  getISOWeekYear,
  getISOWeeksInYear,
  startOfISOWeek,
} from "date-fns";
import { WEEKDAYS } from "../constants/weekdays.js";

// ISO week keys ("2026-W38") ↔ calendar dates. Calendar dates are Date objects at UTC
// midnight (database_schema.md §0.2). date-fns works in the process's local time zone, so
// every calculation crosses into a local date with the same year/month/day and back again:
// the answer is then the same on Render (UTC) and on a machine in any other zone.

const WEEK_KEY = /^(\d{4})-W(\d{2})$/;

const toLocal = (utc) =>
  new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
const toUtc = (local) =>
  new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));
const pad = (n) => String(n).padStart(2, "0");

const keyOfLocal = (local) =>
  `${getISOWeekYear(local)}-W${pad(getISOWeek(local))}`;

// W53 only in ISO years that have one; Jan 4 is always in week 1 of its ISO year.
export function isWeekKey(value) {
  const match = typeof value === "string" && WEEK_KEY.exec(value);
  if (!match) return false;
  const week = Number(match[2]);
  return (
    week >= 1 && week <= getISOWeeksInYear(new Date(Number(match[1]), 0, 4))
  );
}

function mondayLocal(weekKey) {
  if (!isWeekKey(weekKey))
    throw new RangeError(`Not an ISO week key: ${weekKey}`);
  const [year, week] = weekKey.split("-W").map(Number);
  return addWeeks(startOfISOWeek(new Date(year, 0, 4)), week - 1);
}

/** The week containing `date`, judged by its UTC calendar day. */
export function weekKeyOf(date) {
  return keyOfLocal(toLocal(date));
}

/** Monday of the week, UTC midnight. */
export function weekStartOf(weekKey) {
  return toUtc(mondayLocal(weekKey));
}

/** Friday of the week, UTC midnight — the Mon–Fri model. */
export function weekEndOf(weekKey) {
  return toUtc(addDays(mondayLocal(weekKey), 4));
}

/** The date of `weekday` ("mon"…"fri") in the week, UTC midnight. */
export function weekdayDate(weekKey, weekday) {
  const offset = WEEKDAYS.indexOf(weekday);
  if (offset === -1) throw new RangeError(`Not a weekday: ${weekday}`);
  return toUtc(addDays(mondayLocal(weekKey), offset));
}

/** "mon"…"fri" for a date's UTC calendar day, or null on a weekend. */
export function weekdayOf(date) {
  const day = toLocal(date).getDay(); // 0 = Sunday
  return day >= 1 && day <= 5 ? WEEKDAYS[day - 1] : null;
}

/** The week `n` weeks after (or, when negative, before) `weekKey`. */
export function shiftWeek(weekKey, n) {
  return keyOfLocal(addWeeks(mondayLocal(weekKey), n));
}

/** Week keys are fixed-width, so they order as strings do. */
export function compareWeekKeys(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** A calendar date as "YYYY-MM-DD" (api_specification.md §1.8). */
export function toDateString(date) {
  return date.toISOString().slice(0, 10);
}
