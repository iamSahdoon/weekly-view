import { TASK_STATUSES, WEEKDAY_LABELS } from "./constants.js";

// The submit checklist (design §4.2, §4.10; frontend_architecture.md §6.4), computed on
// the client from the week's `dayStates` and the form's current task statuses, so
// `Submit` is enabled the moment the last status is chosen — not after the autosave
// round trip. The same two rules, and the same words, as the server's submitRules; R7's
// 422 stays the authority.
//
//   week        the WeekView
//   taskStates  the form's { [taskId]: { status, note } }; a task with no entry falls
//               back to the status the server holds
//
// Returns { ok, items, missingDays, unsetTasks, reason }: `items` are the rail's two
// lines, `reason` the first thing missing, for the disabled Submit's tooltip.

export function submitChecklist(week, taskStates = {}) {
  const missingDays = (week.expectedDays ?? []).filter(
    (day) => week.dayStates[day] !== "posted",
  );
  const unsetTasks = (week.report?.tasks ?? [])
    .filter((t) => {
      const status = taskStates[t.task._id]?.status ?? t.status;
      return !TASK_STATUSES.includes(status);
    })
    .map((t) => t.task._id);

  const items = [
    {
      id: "days",
      label: "Every working day has an update",
      met: missingDays.length === 0,
    },
    {
      id: "tasks",
      label: "Every task has a status",
      met: unsetTasks.length === 0,
    },
  ];

  let reason = null;
  if (missingDays.length > 0) {
    reason = `${WEEKDAY_LABELS[missingDays[0]]} has no update.`;
  } else if (unsetTasks.length === 1) {
    reason = "One task has no status.";
  } else if (unsetTasks.length > 1) {
    reason = `${unsetTasks.length} tasks have no status.`;
  }

  return {
    ok: reason === null,
    items,
    missingDays,
    unsetTasks,
    reason,
  };
}
