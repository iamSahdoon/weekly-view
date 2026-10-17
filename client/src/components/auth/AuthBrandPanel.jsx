import { motion as Motion, useReducedMotion } from "motion/react";
import { WEEKDAYS, WEEKDAY_SHORT } from "../../lib/constants.js";
import { cn } from "../../lib/cn.js";
import { DaySquare } from "../dashboard/UpdatesCell.jsx";
import { BrandMark } from "../shell/BrandMark.jsx";

// The auth screens' brand panel (owner decisions, auth pages 2026-10-17; design §3.12): one
// block, centred in the panel — the wordmark, a small preview of a real week in the app's
// own style, and one plain line — on --tint with a faint hairline grid. The preview is the
// week strip with the product's Updates states (posted, posted, posted, today, holiday) and
// the posted Wednesday as a day card, marked as sample data. The squares come in Monday to
// Friday once, when the screen opens (design §8.5 entry 32, an owner-approved exception to
// §8.4): 200ms each, 120ms apart; under reduced motion they are simply there. Decorative:
// the sentence under it says what it means. From 1024px only; below that the layout's slim
// header stands in for it.

const EASE = [0.2, 0, 0, 1];
const FIRST = 0.3;
const STEP = 0.12;

const WEEK = {
  mon: "posted",
  tue: "posted",
  wed: "posted",
  thu: "today",
  fri: "holiday",
};
const SELECTED = "wed";
const LINES = [
  {
    task: "Booking flow",
    type: "Development",
    color: "var(--c1)",
    done: "Date validation and error states",
    hours: "4.5",
  },
  {
    task: "Login timeout",
    type: "Testing",
    color: "var(--c2)",
    done: "Wrote the regression tests",
    hours: "2.5",
  },
];

// The hairline grid behind the block: --hair lines on --tint, 32px apart.
const GRID = {
  backgroundImage:
    "linear-gradient(var(--hair) 1px, transparent 1px), linear-gradient(90deg, var(--hair) 1px, transparent 1px)",
  backgroundSize: "32px 32px",
  backgroundPosition: "-1px -1px",
};

function WeekPreview({ still }) {
  return (
    <div className="border border-hair bg-card">
      <div className="flex items-center justify-between gap-11 border-b border-hair px-16 py-11">
        <span className="font-display text-panel-sm font-bold text-ink">
          This week
        </span>
        <span className="inline-flex items-center border border-dashed border-rule px-6 py-2 font-mono text-micro leading-none font-medium text-mut">
          SAMPLE DATA
        </span>
      </div>
      <div className="grid grid-cols-5 divide-x divide-hair border-b border-hair">
        {WEEKDAYS.map((weekday, i) => {
          const state = WEEK[weekday];
          return (
            <div
              key={weekday}
              className={cn(
                "relative flex items-center justify-center gap-6 py-11 text-dense font-medium",
                state === "holiday" ? "bg-tint text-mut" : "text-ink",
              )}
            >
              {weekday === SELECTED && (
                <span className="absolute inset-x-0 top-0 h-2 bg-ink" />
              )}
              {WEEKDAY_SHORT[weekday]}
              <span className="relative size-[10px]">
                <DaySquare
                  state="future"
                  size={10}
                  className="absolute inset-0"
                />
                <Motion.span
                  className="absolute inset-0"
                  initial={still ? false : { opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: FIRST + i * STEP,
                    duration: 0.2,
                    ease: EASE,
                  }}
                >
                  <DaySquare state={state} size={10} />
                </Motion.span>
              </span>
              {state === "today" && (
                <span className="absolute inset-x-0 bottom-0 h-2 bg-acc" />
              )}
            </div>
          );
        })}
      </div>
      <div className="px-16 pt-14 pb-16">
        <div className="flex items-baseline justify-between gap-11">
          <span className="flex items-baseline gap-8">
            <span className="font-display text-panel-sm font-bold text-ink">
              Wednesday
            </span>
            <span className="text-caption text-mut">Posted 17:42</span>
          </span>
          <span className="font-mono text-caption text-body">7 h</span>
        </div>
        <ul className="mt-11 flex flex-col gap-8">
          {LINES.map((line) => (
            <li
              key={line.task}
              className="flex items-start justify-between gap-14 border-t border-hair pt-8 first:border-t-0 first:pt-0"
            >
              <span className="flex min-w-0 gap-8">
                <span
                  className="mt-[3px] h-[14px] w-[3px] shrink-0"
                  style={{ background: line.color }}
                />
                <span className="min-w-0">
                  <span className="block text-dense font-medium text-ink">
                    {line.task}
                    <span className="font-normal text-mut"> · {line.type}</span>
                  </span>
                  <span className="block text-dense text-body">
                    {line.done}
                  </span>
                </span>
              </span>
              <span className="font-mono text-caption text-body">
                {line.hours}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function AuthBrandPanel({ className }) {
  const still = useReducedMotion();
  return (
    <aside
      aria-label="About WeeklyView"
      className={cn(
        "sticky top-0 flex h-[100dvh] items-center justify-center border-l border-hair bg-tint px-52 py-52",
        className,
      )}
      style={GRID}
    >
      <div className="w-full max-w-[400px]">
        <BrandMark className="text-[22px]" glyphSize={22} />
        <div aria-hidden="true" className="mt-32">
          <WeekPreview still={still} />
        </div>
        <p className="mt-32 font-display text-sub font-bold text-ink">
          One short update a day.
        </p>
        <p className="mt-8 text-base text-body">
          Each person posts what they did, and Friday&rsquo;s weekly report
          builds itself from the five days.
        </p>
      </div>
    </aside>
  );
}
