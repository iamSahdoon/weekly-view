import { format } from "date-fns";
import { WEEKDAYS } from "../../lib/constants.js";
import { parseCalendarDate } from "../../lib/dates.js";
import { DaySquare } from "../dashboard/UpdatesCell.jsx";

// The leave and holiday line under the week strip (design §3.1): a single --tint line,
// present only when there is something to say. Who is on leave is known for *now*
// only (U10), so `names` is given for the current week alone (§9.1, FA8); holidays
// are shown for any week. The person on leave sees "You're on leave" with Turn off.
//
//   names     ["Dinesh K.", …] — others on leave now, or null
//   holidays  { [weekday]: { date, name } }

export function OnLeaveStrip({
  names,
  holidays = {},
  isCurrentWeek,
  meOnLeave,
  onEndLeave,
  ending = false,
  error = null,
}) {
  const others = isCurrentWeek && names?.length ? names : null;
  const days = WEEKDAYS.filter((d) => holidays[d]);
  const mine = isCurrentWeek && meOnLeave;
  if (!others && days.length === 0 && !mine) return null;

  return (
    <div
      data-tour="on-leave-strip"
      className="flex flex-wrap items-center gap-x-20 gap-y-6 bg-tint px-14 py-8 text-dense text-body"
    >
      {mine && (
        <span className="inline-flex items-center gap-8">
          You’re on leave
          <button
            type="button"
            disabled={ending}
            onClick={onEndLeave}
            className="focus-halo font-medium text-ink underline underline-offset-2 disabled:text-mut"
          >
            Turn off
          </button>
          {error && (
            <span role="alert" className="text-st-corr-fg">
              {error}
            </span>
          )}
        </span>
      )}
      {others && <Item square="leave">On leave: {others.join(", ")}</Item>}
      {days.map((weekday) => {
        const holiday = holidays[weekday];
        const date = parseCalendarDate(holiday.date.slice(0, 10));
        return (
          <Item key={weekday} square="holiday">
            Holiday {format(date, "EEE d MMM")}: {holiday.name}
          </Item>
        );
      })}
    </div>
  );
}

// Each item leads with its Updates square (polish, 2026-10-10) — the hatch for leave,
// the dots for a holiday — so the line reads like the squares' legend and wraps
// cleanly, where a middle dot used to start the second line.
function Item({ square, children }) {
  return (
    <span className="inline-flex items-center gap-8">
      <DaySquare state={square} size={10} />
      <span>{children}</span>
    </span>
  );
}
