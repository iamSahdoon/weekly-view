import { WEEKDAYS } from "../../lib/constants.js";
import { updatesSentence } from "../../lib/dashboardData.js";
import { cn } from "../../lib/cn.js";

// The five-day strip at table scale (design §3.7): five 14×14px cells.
//   posted        --acc fill
//   missing       1px --st-corr-fg border
//   today         1px --acc border (not posted yet)
//   leave, holiday  --tint2 with a diagonal hairline
//   future        1px --hair border
// A visually hidden sentence says the same in words, always ("Posted Mon, Tue; missing
// Wed") — colour is never the only carrier.

const CELL = {
  posted: "border-acc bg-acc",
  missing: "border-st-corr-fg bg-card",
  today: "border-acc bg-card",
  leave: "border-hair bg-tint2",
  holiday: "border-hair bg-tint2",
  not_on_team: "border-hair bg-tint2",
  future: "border-hair bg-card",
};
const HATCHED = new Set(["leave", "holiday"]);
const HATCH = {
  backgroundImage:
    "linear-gradient(to top right, transparent calc(50% - .5px), var(--hair2) calc(50% - .5px), var(--hair2) calc(50% + .5px), transparent calc(50% + .5px))",
};

export function UpdatesCell({ dayStates }) {
  return (
    <span className="inline-flex items-center gap-4">
      {WEEKDAYS.map((weekday) => {
        const state = dayStates[weekday] ?? "future";
        return (
          <span
            key={weekday}
            aria-hidden="true"
            data-state={state}
            style={HATCHED.has(state) ? HATCH : undefined}
            className={cn("size-[14px] border", CELL[state] ?? CELL.future)}
          />
        );
      })}
      <span className="sr-only">{updatesSentence(dayStates)}</span>
    </span>
  );
}
