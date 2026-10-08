// Status and week state → label + the token classes StatusChip renders
// (design §6.8). Text is exactly the spec's; no colour outside the --st-* tokens.

const TONES = {
  draft: "border-st-draft-bd bg-st-draft-bg text-st-draft-fg",
  submitted: "border-st-subm-bd bg-st-subm-bg text-st-subm-fg",
  corr: "border-st-corr-bd bg-st-corr-bg text-st-corr-fg",
  approved: "border-st-appr-bd bg-st-appr-bg text-st-appr-fg",
  none: "border-dashed border-st-none-bd bg-st-none-bg text-st-none-fg",
  // On leave and Holiday week: the neutral family, told apart by the solid edge.
  neutral: "border-hair2 bg-tint2 text-body",
  // Task statuses borrow no status colour beyond Done.
  task: "border-hair bg-tint text-body",
  taskDone: "border-hair bg-tint text-st-appr-fg",
};

export const STATUS_MAPS = Object.freeze({
  report: {
    draft: { label: "Draft", tone: TONES.draft },
    submitted: { label: "Submitted", tone: TONES.submitted },
    needs_correction: { label: "Needs correction", tone: TONES.corr },
    approved: { label: "Approved", tone: TONES.approved },
  },
  week: {
    not_started: { label: "Not started", tone: TONES.none },
    on_leave: { label: "On leave", tone: TONES.neutral },
    holiday_week: { label: "Holiday week", tone: TONES.neutral },
  },
  task: {
    not_started: { label: "Not started", tone: TONES.task },
    in_progress: { label: "In progress", tone: TONES.task },
    done: { label: "Done", tone: TONES.taskDone },
    carried_over: { label: "Carried over", tone: TONES.task },
  },
  // Users reuse the Approved and Draft palettes with their own labels (§6.8).
  user: {
    active: { label: "Active", tone: TONES.approved },
    invited: { label: "Invited", tone: TONES.draft },
    // The removed marker (design §3.15): a quiet chip beside the name, never a strike.
    removed: { label: "Removed", tone: TONES.neutral },
  },
});

// A week's state is a report status or one of the three derived states; one
// lookup for both, so a row never has to know which it holds.
export function statusOf(kind, value) {
  if (kind === "week") {
    return STATUS_MAPS.week[value] ?? STATUS_MAPS.report[value] ?? null;
  }
  return STATUS_MAPS[kind]?.[value] ?? null;
}
