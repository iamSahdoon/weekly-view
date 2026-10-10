// The two scroll stories' steps (owner decision, landing revamp): a short kicker and one
// sentence each — under 15 words, saying what the thing is for. The order is the order
// the story walks; WeekSection and DeskSection mark each step's target with `data-t`.
// A dashboard step's `f` is the "Show" filter it switches to.

export const WEEK_STEPS = [
  {
    kicker: "Monday",
    text: "Each day ends with a short note: a few minutes, not a meeting.",
  },
  {
    kicker: "A work line",
    text: "Each line says the task, its type, and what was done.",
  },
  {
    kicker: "Hours",
    text: "Hours make the week add up, with no timesheet to fill in.",
  },
  {
    kicker: "A blocker",
    text: "Stuck? Add a blocker. Your manager and team see it that evening.",
  },
  {
    kicker: "Team comments",
    text: "Open a day to comments, and a teammate can help right there.",
  },
  {
    kicker: "Wednesday to Friday",
    text: "The rest of the week is the same: one short note a day.",
  },
  {
    kicker: "Friday’s report",
    text: "On Friday, your five days fill in the weekly report for you.",
  },
  {
    kicker: "Submit",
    text: "Give each task a status and submit. Asking for approval is optional.",
  },
];

export const DESK_STEPS = [
  {
    kicker: "Filed this week",
    text: "How many weekly reports are in so far.",
    f: "all",
  },
  {
    kicker: "Compliance",
    text: "How many of the expected reports are in. Anyone on leave isn’t expected.",
    f: "all",
  },
  {
    kicker: "Needs correction",
    text: "Reports sent back for a fix, waiting on their author.",
    f: "all",
  },
  {
    kicker: "Open blockers",
    text: "Everything holding the team up, gathered from the daily notes.",
    f: "all",
  },
  {
    kicker: "The squares",
    text: "One square per person per day, so gaps show at a glance.",
    f: "all",
  },
  {
    kicker: "The legend",
    text: "Blue is posted, a red cross is missing, and hatched is on leave.",
    f: "all",
  },
  {
    kicker: "Show: Everyone",
    text: "The whole team’s week, one row per person.",
    f: "all",
  },
  {
    kicker: "Show: Needs correction",
    text: "Who has a report to fix, so you can help them finish.",
    f: "corr",
  },
  {
    kicker: "Show: Not started",
    text: "Who hasn’t begun this week. A fact, never a telling-off.",
    f: "none",
  },
  {
    kicker: "Show: Has blocker",
    text: "Who is stuck right now, so you can unblock them first.",
    f: "blk",
  },
];
