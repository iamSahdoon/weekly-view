import { format, isSameDay, parseISO } from "date-fns";

// The words for how a report was reviewed (design §3.6): "Approved by Ruwan P. at 10:22",
// "Sent back by Ruwan P. on 11 Sep at 16:05". The reviewer and time come from the report's
// current version (R8); until that has loaded, the report's own last activity stands in
// and the reviewer is left out rather than guessed.

const VERBS = { approved: "Approved", needs_correction: "Sent back" };

function whenOf(value, now) {
  const date = parseISO(value);
  const time = format(date, "HH:mm");
  return isSameDay(date, now)
    ? `at ${time}`
    : `on ${format(date, "d MMM")} at ${time}`;
}

/** `revision` is the report's current RevisionSummary, or null. Null for any other status. */
export function outcomeLine(report, revision, now = new Date()) {
  const verb = VERBS[report.status];
  if (!verb) return null;
  const by = revision?.reviewedBy?.name;
  const at = revision?.reviewedAt ?? report.lastActivityAt;
  return [verb, by && `by ${by}`, at && whenOf(at, now)]
    .filter(Boolean)
    .join(" ");
}
