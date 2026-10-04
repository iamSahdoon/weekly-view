// The one statement of the submit rules (requirments_doc.md §2.2, database_schema.md
// §3.3): every expected day has a posted update, and every task has a status. R7 enforces
// it; the WeekView uses it to explain a disabled Submit. Pure.

const DAY_NAMES = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
};

/**
 * `expectedDays` — weekdays; `postedDays` — weekdays with an update; `tasks` —
 * `content.tasks` entries `{ task, status }`. Returns `fields` keyed as R7's 422 carries
 * them, and `messages` for `submitBlockers`, in day order then tasks.
 */
export function checkSubmit({ expectedDays, postedDays, tasks }) {
  const posted = new Set(postedDays);
  const fields = {};
  const messages = [];
  for (const day of expectedDays) {
    if (!posted.has(day)) {
      const message = `${DAY_NAMES[day]} has no update.`;
      fields[`days.${day}`] = message;
      messages.push(message);
    }
  }
  const unset = tasks.filter((t) => !t.status);
  for (const t of unset)
    fields[`tasks.${String(t.task)}.status`] = "Choose a status.";
  if (unset.length === 1) messages.push("One task has no status.");
  if (unset.length > 1) messages.push(`${unset.length} tasks have no status.`);
  return { ok: messages.length === 0, fields, messages };
}
