import { cn } from "../../lib/cn.js";
import { WEEKDAYS } from "../../lib/constants.js";
import { updatesSentence } from "../../lib/dashboardData.js";

// The five-day strip at table scale (design §3.7, as amended by the owner after C7): five
// 14×14px square cells in the product's own palette — cobalt, cool neutrals and the
// Needs-correction red — that read at a glance and never by colour alone: every state
// has its own shape or pattern.
//   posted        solid --acc (cobalt)
//   missing       --st-corr-bg fill, a 2px --st-corr-fg edge and an × through it — the same
//                 danger as a Needs correction chip
//   today         hollow, a 2px --acc outline (not posted yet)
//   leave         --tint2 with a diagonal hatch of --mut stripes
//   holiday       --tint2 with a dot grid of --mut dots — a different pattern from leave
//   future        hollow, a faint 1px --hair outline
// A hidden sentence says the same in words ("Posted Mon, Tue; missing Wed"), and
// `UpdatesLegend` shows the six cells with their words under the table.

const CROSS = (color) =>
  `linear-gradient(45deg, transparent calc(50% - 1px), ${color} calc(50% - 1px), ${color} calc(50% + 1px), transparent calc(50% + 1px)), ` +
  `linear-gradient(-45deg, transparent calc(50% - 1px), ${color} calc(50% - 1px), ${color} calc(50% + 1px), transparent calc(50% + 1px))`;
const HATCH =
  "repeating-linear-gradient(45deg, var(--mut) 0 1.5px, transparent 1.5px 4px)";
const DOTS = "radial-gradient(circle, var(--mut) 1.1px, transparent 1.6px)";

// One style per state, tokens only. The hatch, the dots and the × are background images,
// so they scale with the cell and need no extra elements.
const STATES = {
  posted: { background: "var(--acc)", border: "1px solid var(--acc)" },
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
  holiday: {
    backgroundColor: "var(--tint2)",
    backgroundImage: DOTS,
    backgroundSize: "4px 4px",
    backgroundPosition: "center",
    border: "1px solid var(--hair2)",
  },
  future: { background: "var(--card)", border: "1px solid var(--hair)" },
  // Before they joined: not a day anyone was expected, drawn as a dashed outline.
  not_on_team: { background: "var(--card)", border: "1px dashed var(--hair2)" },
};

function Cell({ state }) {
  return <DaySquare state={state} />;
}

/**
 * One Updates square on its own, for wherever a day's state is shown (polish,
 * 2026-10-10): the week strip on This week and above the form, the leave and holiday
 * line. 14px in tables, 10px beside text. Decorative — the words say the same.
 */
export function DaySquare({ state, size = 14, className }) {
  const style = { ...(STATES[state] ?? STATES.future) };
  // At 10px the 4px dot grid holds two dots; a 3px grid keeps it reading as dots.
  if (state === "holiday" && size < 14) style.backgroundSize = "3px 3px";
  return (
    <span
      aria-hidden="true"
      data-state={state}
      style={style}
      className={cn(
        "box-border inline-block shrink-0",
        size < 14 ? "size-[10px]" : "size-[14px]",
        className,
      )}
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
  ["leave", "On leave"],
  ["holiday", "Holiday"],
  ["future", "Later this week"],
];

/** The six cells with their words, for under the table. */
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
