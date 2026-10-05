import { format, formatDistanceStrict, isSameMonth, parseISO } from "date-fns";
import { weekDays, weekNumberLabel } from "./dates.js";

// Display formats. Dates and figures are rendered in mono by the caller
// (design §0.5); these only produce the strings.

function toDate(value) {
  return value instanceof Date ? value : parseISO(value);
}

/** 7.5 → "7.5", 8 → "8", 0.25 → "0.25". Hours are 0.25 steps. */
export function formatHours(hours) {
  if (hours == null) return "—";
  return String(Math.round(hours * 100) / 100);
}

/** 0.83 → "83%"; null (no denominator) → "—". */
export function formatPercent(rate) {
  if (rate == null) return "—";
  return `${Math.round(rate * 100)}%`;
}

/** "14 Sep" — a calendar date or an instant, in local time. */
export function formatDate(value) {
  return format(toDate(value), "d MMM");
}

/** "14 Sep 2026". */
export function formatDateLong(value) {
  return format(toDate(value), "d MMM yyyy");
}

/** "11 Sep 09:14" — an instant, in the viewer's local time. */
export function formatDateTime(value) {
  return format(toDate(value), "d MMM HH:mm");
}

/** "09:14". */
export function formatTime(value) {
  return format(toDate(value), "HH:mm");
}

/** "14–18 Sep", or "28 Sep – 2 Oct" across a month. */
export function formatWeekRange(weekKey) {
  const days = weekDays(weekKey);
  const first = days[0].date;
  const last = days[4].date;
  if (isSameMonth(first, last)) {
    return `${format(first, "d")}–${format(last, "d MMM")}`;
  }
  return `${format(first, "d MMM")} – ${format(last, "d MMM")}`;
}

/** "W38 · 14–18 Sep" — the week picker's label (design §6.5). */
export function formatWeekLabel(weekKey) {
  return `${weekNumberLabel(weekKey)} · ${formatWeekRange(weekKey)}`;
}

/** "3 hours ago" style, for activity lines. */
export function formatRelative(value, now = new Date()) {
  return formatDistanceStrict(toDate(value), now, { addSuffix: true });
}

/** "Imali Jayasuriya" → "IJ"; one word → its first two letters. */
export function initialsOf(name = "") {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * Whole minutes left in a 10-minute comment window, rounded up so the label never
 * reads "0 min" while the buttons are still there; 0 once `editableUntil` has passed.
 */
export function minutesLeft(editableUntil, nowMs) {
  const left = toDate(editableUntil).getTime() - nowMs;
  return left > 0 ? Math.ceil(left / 60_000) : 0;
}

/** "Imali J." → "Imali". */
export function firstNameOf(name = "") {
  return name.trim().split(/\s+/)[0] ?? "";
}

const OUTCOMES = { changes_requested: "sent back", approved: "approved" };

/** The word for a version's outcome; one nobody has reviewed is "submitted". */
export function revisionOutcome(revision) {
  return OUTCOMES[revision.action] ?? "submitted";
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * A project's progress in words (design §3.1, §6.25): "8 days left" / "overdue by 2
 * days", or in hours "96.5 of 160 h" ("96.5 h logged" when no hours were planned).
 */
export function formatProgress(progress, unit = "days") {
  if (!progress?.plan) return "No plan";
  if (unit === "hours") {
    const planned = progress.plan.plannedHours;
    return planned
      ? `${formatHours(progress.hoursLogged)} of ${formatHours(planned)} h`
      : `${formatHours(progress.hoursLogged)} h logged`;
  }
  return progress.overdueDays > 0
    ? `overdue by ${plural(progress.overdueDays, "day")}`
    : `${plural(progress.daysLeft, "day")} left`;
}

/**
 * The confirm before ending leave (owner decision, C4): yourself, or — for a manager or
 * admin — someone else. `person` is a UserRef or Me.
 */
export function endLeaveCopy(person, isSelf) {
  if (isSelf) {
    return {
      title: "Turn off your leave?",
      body: "Today will need a daily update.",
      confirmLabel: "Turn off leave",
    };
  }
  const first = firstNameOf(person?.name) || "This person";
  return {
    title: `Turn off ${first}’s leave?`,
    body: `${first} will need a daily update for today.`,
    confirmLabel: "Turn off leave",
  };
}
