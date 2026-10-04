// The one query-key factory (frontend_architecture.md §5.4). No component or hook
// writes a key literal. Filter objects are the output of apiParams, so two equal
// views share a cache entry.

export const qk = {
  bootstrap: () => ["auth", "bootstrap"],
  // Never carries the link token (rule 7): the token lives in component state.
  linkPreview: () => ["auth", "link-preview"],

  week: (userId, weekKey) => ["week", userId, weekKey], // R3 for yourself, U8 for anyone else
  report: (id) => ["report", id], // R4
  revisions: (id) => ["report", id, "revisions"], // R8
  revision: (id, n) => ["report", id, "revisions", n], // R9
  reports: (filters) => ["reports", filters], // R1
  reportsOf: (userId, filters) => ["reports", "of", userId, filters], // U7
  summary: (weekKey, month) => ["reports", "summary", { weekKey, month }], // R2

  teamUpdates: (weekKey, weekday, f) => ["teamUpdates", weekKey, weekday, f], // R12
  reviewDesk: (filters) => ["reviewDesk", filters], // V3
  reviewDeskCount: () => ["reviewDesk", "count"], // V4

  tasks: (opts) => ["tasks", opts], // T1
  projects: (opts) => ["projects", opts], // P1
  holidays: (year) => ["holidays", year], // HD1
  onLeave: () => ["onLeave"], // U10
  users: (filters) => ["users", filters], // U1
  user: (id) => ["users", "detail", id], // U2
  newMarks: () => ["newMarks"], // N1

  dashboard: {
    summary: (weekKey, f) => ["dashboard", weekKey, "summary", f], // D1
    team: (weekKey, f) => ["dashboard", weekKey, "team", f], // D2
    trend: (endWeek, f) => ["dashboard", endWeek, "trend", f], // D3
    hours: (weekKey, f) => ["dashboard", weekKey, "hours", f], // D4
    workload: (weekKey, f) => ["dashboard", weekKey, "workload", f], // D5
    projects: (weekKey, f) => ["dashboard", weekKey, "projects", f], // D8
    activity: () => ["dashboard", "activity"], // D6 — not week-scoped
    person: (userId) => ["dashboard", "person", userId], // D7
  },
};
