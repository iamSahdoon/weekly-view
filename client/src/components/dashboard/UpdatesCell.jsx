import { WEEKDAYS } from "../../lib/constants.js";
import { updatesSentence } from "../../lib/dashboardData.js";

// The five-day strip at table scale (design §3.7, as amended by the owner after C7): five
// 14×14px cells that read at a glance and never by colour alone — each state has a shape.
//   posted        solid --st-appr-fg (the success green)
//   missing       --st-corr-bg fill, a 2px --st-corr-fg edge and an × through it
//   today         hollow, a 2px --acc edge (not posted yet)
//   leave, holiday  --tint2 with a diagonal hatch of --c6 stripes, a --hair2 edge
//   future        hollow, a 1px --hair edge
// A hidden sentence says the same in words ("Posted Mon, Tue; missing Wed"), and
// `UpdatesLegend` shows the cells with their words under the table.

const CROSS = (color) =>
  `linear-gradient(45deg, transparent calc(50% - 1px), ${color} calc(50% - 1px), ${color} calc(50% + 1px), transparent calc(50% + 1px)), ` +
  `linear-gradient(-45deg, transparent calc(50% - 1px), ${color} calc(50% - 1px), ${color} calc(50% + 1px), transparent calc(50% + 1px))`;
const HATCH =
  "repeating-linear-gradient(45deg, var(--c6) 0 2px, transparent 2px 4px)";

// One style per state, tokens only. The hatch and the × are background images, so they
// scale with the cell and need no extra elements.
const STATES = {
  posted: {
    background: "var(--st-appr-fg)",
    border: "1px solid var(--st-appr-fg)",
  },
  missing: {
    backgroundColor: "var(--st-corr-bg)",
    backgroundImage: CROSS("var(--st-corr-fg)"),
    border: "2px solid var(--st-corr-fg)",
  },
  today: { background: "var(--card)", border: "2px solid var(--acc)" },
  leave: {
    backgroundColor: "var(--tint2)",
    backgroundImage: HATCH,
    border: "1px solid var(--hair2)",
  },
  future: { background: "var(--card)", border: "1px solid var(--hair)" },
};
STATES.holiday = STATES.leave;
STATES.not_on_team = STATES.leave;

function Cell({ state }) {
  return (
    <span
      aria-hidden="true"
      data-state={state}
      style={STATES[state] ?? STATES.future}
      className="box-border inline-block size-[14px] shrink-0"
    />
  );
}

export function UpdatesCell({ dayStates }) {
  return (
    <span className="inline-flex items-center gap-4">
      {WEEKDAYS.map((weekday) => (
        <Cell key={weekday} state={dayStates[weekday] ?? "future"} />
      ))}
      <span className="sr-only">{updatesSentence(dayStates)}</span>
    </span>
  );
}

const LEGEND = [
  ["posted", "Posted"],
  ["missing", "Missing"],
  ["today", "Not posted yet today"],
  ["leave", "Leave or holiday"],
  ["future", "Later this week"],
];

/** The cells with their words, for under the table. */
export function UpdatesLegend() {
  return (
    <ul
      aria-label="What the update squares mean"
      className="mt-4 flex flex-wrap items-center gap-x-20 gap-y-6 text-caption text-mut"
    >
      {LEGEND.map(([state, label]) => (
        <li key={state} className="flex items-center gap-6">
          <Cell state={state} />
          {label}
        </li>
      ))}
    </ul>
  );
}
