// The client's copy of the shared vocabulary (project_structure.md §7.1).
// The five value sets must equal server/src/constants/ — constants.parity.test.js
// holds them together. Labels are the exact words of CLAUDE.md's vocabulary.

export const REPORT_STATUSES = Object.freeze([
  "draft",
  "submitted",
  "needs_correction",
  "approved",
]);

// Lowest to highest; admin includes manager.
export const ROLES = Object.freeze(["member", "manager", "admin"]);

export const TASK_STATUSES = Object.freeze([
  "not_started",
  "in_progress",
  "done",
  "carried_over",
]);

export const TASK_TYPES = Object.freeze([
  "development",
  "testing",
  "meetings",
  "documentation",
  "review",
  "research_study",
  "other",
]);

export const WEEKDAYS = Object.freeze(["mon", "tue", "wed", "thu", "fri"]);

// Derived week states — never stored by the server (api_specification.md §1.10).
export const WEEK_STATES = Object.freeze([
  "not_started",
  "on_leave",
  "holiday_week",
]);

export const USER_STATUSES = Object.freeze(["invited", "active", "removed"]);

export const ROLE_LABELS = Object.freeze({
  member: "Team member",
  manager: "Manager",
  admin: "Admin",
});

export const TASK_TYPE_LABELS = Object.freeze({
  development: "Development",
  testing: "Testing",
  meetings: "Meetings",
  documentation: "Documentation",
  review: "Review",
  research_study: "Research & study",
  other: "Other",
});

// Chart colour per task type — fixed by category (design §9.3, --c1…--c7).
export const TASK_TYPE_COLORS = Object.freeze({
  development: "var(--c1)",
  testing: "var(--c2)",
  meetings: "var(--c3)",
  documentation: "var(--c4)",
  review: "var(--c5)",
  other: "var(--c6)",
  research_study: "var(--c7)",
});

export const WEEKDAY_LABELS = Object.freeze({
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
});

export const WEEKDAY_SHORT = Object.freeze({
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
});

export const PAGE_LIMITS = Object.freeze([20, 50, 100]);
