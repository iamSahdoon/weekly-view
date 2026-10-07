import { TASK_TYPE_LABELS, WEEKDAYS, WEEKDAY_SHORT } from "./constants.js";
import { personWeekHref } from "./dashboardParams.js";
import { weekNumberLabel } from "./dates.js";
import { formatHours } from "./format.js";

// What the dashboard blocks do to the API's answers before drawing them: pure functions,
// no React, so each is tested on its own (frontend_architecture.md §9.8, §10).

const weekNumber = (weekKey) => weekNumberLabel(weekKey).slice(1);
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// ---------------------------------------------------------------- team table

/** Where a team row goes: a Submitted report that isn't yours opens for review. */
export function teamRowHref(row, meId, weekKey) {
  if (row.state === "submitted" && row.report && row.user._id !== meId) {
    return `/review/${row.report._id}`;
  }
  return personWeekHref(row.user._id, meId, weekKey);
}

/** "Posted Mon, Tue; missing Wed" — the five-day strip in words. */
export function updatesSentence(dayStates) {
  const named = (state) =>
    WEEKDAYS.filter((d) => dayStates[d] === state)
      .map((d) => WEEKDAY_SHORT[d])
      .join(", ");
  const parts = [
    ["Posted", named("posted")],
    ["missing", named("missing")],
    ["not yet today", named("today")],
    ["on leave", named("leave")],
    ["holiday", named("holiday")],
  ]
    .filter(([, days]) => days)
    .map(([label, days]) => `${label} ${days}`);
  return parts.length ? parts.join("; ") : "Nothing posted";
}

// ---------------------------------------------------------------- projects table

/** "12 of 20 · 8 left", "overdue by 3 days", "96 h of 160 h", or "96 h" without a plan. */
export function progressText(progress, unit) {
  if (unit === "hours") {
    const planned = progress.plan?.plannedHours;
    return planned
      ? `${formatHours(progress.hoursLogged)} h of ${formatHours(planned)} h`
      : `${formatHours(progress.hoursLogged)} h`;
  }
  if (progress.overdueDays > 0) {
    return `overdue by ${plural(progress.overdueDays, "day")}`;
  }
  return `${progress.daysUsed} of ${progress.plan.plannedDays} · ${progress.daysLeft} left`;
}

// ---------------------------------------------------------------- activity feed

/** "week 40" for your own, "Imali J.’s week 40" for someone else's. */
export function activityTarget(event) {
  const week = `week ${weekNumber(event.report.weekKey)}`;
  const own = event.actor?._id === event.report.author?._id;
  return own ? week : `${event.report.author?.name ?? "someone"}’s ${week}`;
}

// ---------------------------------------------------------------- charts

/** D3's answer as chart rows: one per week, `person` only when a person was asked for. */
export function trendRows(data) {
  const person = data.person
    ? new Map(data.person.map((p) => [p.weekKey, p.tasksDone]))
    : null;
  return data.team.map(({ weekKey, tasksDone }) => ({
    weekKey,
    label: weekNumberLabel(weekKey),
    team: tasksDone,
    ...(person ? { person: person.get(weekKey) ?? 0 } : {}),
  }));
}

/** The trend's empty-plot text, or null when any week has a Done task. */
export function trendEmptyText(rows) {
  const empty = rows.every((row) => row.team === 0 && !row.person);
  return empty ? `No data for ${rows[0].label}–${rows.at(-1).label}.` : null;
}

/** D4's answer as chart rows, in the order the server sent: the fixed seven. */
export const hoursRows = (data) =>
  data.items.map(({ type, hours }) => ({
    type,
    label: TASK_TYPE_LABELS[type],
    hours,
  }));

export const hoursEmptyText = (data, weekKey) =>
  data.total === 0 ? `No data for week ${weekNumber(weekKey)}.` : null;

/** D5's answer as chart rows: the project's name, each type's hours, and the total. */
export const workloadRows = (data) =>
  data.items.map(({ project, hours, totalHours }) => ({
    id: project._id,
    name: project.name,
    ...hours,
    totalHours,
    // A hair of width for the label that carries the total (WorkloadByProjectChart).
    end: 0.001,
  }));

export const workloadEmptyText = (data, weekKey) =>
  data.items.length === 0 || data.items.every((i) => i.totalHours === 0)
    ? `No data for week ${weekNumber(weekKey)}.`
    : null;
