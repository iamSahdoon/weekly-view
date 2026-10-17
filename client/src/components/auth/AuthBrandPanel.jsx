import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { WEEKDAYS, WEEKDAY_SHORT } from "../../lib/constants.js";
import { cn } from "../../lib/cn.js";
import { DaySquare } from "../dashboard/UpdatesCell.jsx";
import { StatusChip } from "../ui/StatusChip.jsx";
import { BrandMark } from "../shell/BrandMark.jsx";
import {
  FINAL_STEP,
  PREVIEW_DAYS,
  PREVIEW_STEPS,
  previewLayer,
} from "./previewSteps.js";

// The auth screens' brand panel (owner decisions, auth pages 2026-10-17; design §3.12): on the
// left from 1024px, on --tint with a faint --hair grid. One 420px block, the form block's
// twin on AuthLayout's shared rows: the wordmark level with "Back to home", a sample week
// in the app's own style level with the form's panel and as tall, and the caption level
// with the form's links. The sample week loops (design §8.5 entry 32,
// an owner-approved exception to §8.4, on these screens only): the chosen day moves Monday →
// Thursday every 3 s and its content cross-fades; on Thursday ("today") the square fills
// and a work line appears; then it starts again. One timer, opacity and transform only;
// it waits while the tab is hidden or the panel is out of view (the phone layout hides
// it), and under reduced motion it shows the posted Thursday and never moves. Decorative
// (aria-hidden): the caption is the real text. Nothing here takes focus or moves the form.

const WEEK = { mon: "posted", tue: "posted", wed: "posted", fri: "holiday" };

const DAYS = {
  mon: {
    title: "Monday",
    meta: "Posted 17:30",
    hours: "7.5 h",
    lines: [
      ["Booking flow", "Development", "var(--c1)", "Search filters", "5"],
      ["Sprint planning", "Meetings", "var(--c3)", "Planned the week", "2.5"],
    ],
  },
  tue: {
    title: "Tuesday",
    meta: "Posted 17:55",
    hours: "7 h",
    lines: [
      ["Booking flow", "Development", "var(--c1)", "Calendar picker", "4"],
      ["Login timeout", "Testing", "var(--c2)", "Reproduced the bug", "3"],
    ],
  },
  wed: {
    title: "Wednesday",
    meta: "Posted 17:42",
    hours: "7 h",
    lines: [
      ["Booking flow", "Development", "var(--c1)", "Error states", "4.5"],
      ["Login timeout", "Testing", "var(--c2)", "Regression tests", "2.5"],
    ],
  },
  "thu-posted": {
    title: "Thursday",
    meta: "Posted 17:48",
    hours: "6.5 h",
    lines: [
      ["Login timeout", "Development", "var(--c1)", "Fixed the timeout", "4"],
      ["API docs", "Documentation", "var(--c4)", "Wrote the guide", "2.5"],
    ],
  },
};

// The hairline grid behind the block: --hair lines on --tint, 32px apart.
const GRID = {
  backgroundImage:
    "linear-gradient(var(--hair) 1px, transparent 1px), linear-gradient(90deg, var(--hair) 1px, transparent 1px)",
  backgroundSize: "32px 32px",
  backgroundPosition: "-1px -1px",
};

const FADE = "transition-opacity duration-[400ms] ease-[var(--ease-out)]";
const SLIDE = "transition-transform duration-[400ms] ease-[var(--ease-out)]";
// Thursday's square: a fade and a small scale together (one transition list — two
// transition classes would merge into one).
const POP =
  "transition-[opacity,scale] duration-[400ms] ease-[var(--ease-out)]";

/** The step to show: advances on one timer while the panel is on screen and the tab visible. */
function usePreviewStep(ref, still) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (still) return undefined;
    const node = ref.current;
    let current = 0;
    let timer = null;
    let inView = typeof IntersectionObserver === "undefined";

    const stop = () => {
      clearTimeout(timer);
      timer = null;
    };
    const run = () => {
      stop();
      if (!inView || document.hidden) return;
      timer = setTimeout(() => {
        current = (current + 1) % PREVIEW_STEPS.length;
        setStep(current);
        run();
      }, PREVIEW_STEPS[current].ms);
    };

    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            run();
          });
    observer?.observe(node);
    document.addEventListener("visibilitychange", run);
    run();
    return () => {
      stop();
      observer?.disconnect();
      document.removeEventListener("visibilitychange", run);
    };
  }, [ref, still]);
  return still ? FINAL_STEP : step;
}

function Lines({ lines }) {
  return (
    <ul className="mt-11 flex flex-col gap-8">
      {lines.map(([task, type, color, done, hours]) => (
        <li
          key={task}
          className="flex items-start justify-between gap-14 border-t border-hair pt-8 first:border-t-0 first:pt-0"
        >
          <span className="flex min-w-0 gap-8">
            <span
              className="mt-[3px] h-[14px] w-[3px] shrink-0"
              style={{ background: color }}
            />
            <span className="min-w-0">
              <span className="block truncate text-dense font-medium text-ink">
                {task}
                <span className="font-normal text-mut"> · {type}</span>
              </span>
              <span className="block truncate text-dense text-body">
                {done}
              </span>
            </span>
          </span>
          <span className="font-mono text-caption text-body">{hours}</span>
        </li>
      ))}
    </ul>
  );
}

function DayHead({ title, meta, hours }) {
  return (
    <div className="flex items-baseline justify-between gap-11">
      <span className="flex items-baseline gap-8">
        <span className="font-display text-panel-sm font-bold text-ink">
          {title}
        </span>
        <span className="text-caption text-mut">{meta}</span>
      </span>
      {hours && (
        <span className="font-mono text-caption text-body">{hours}</span>
      )}
    </div>
  );
}

function WeekPreview({ step }) {
  const { day, thuPosted } = PREVIEW_STEPS[step];
  const layer = previewLayer(step);
  return (
    <div className="flex w-full flex-col border border-hair bg-card">
      <div className="flex items-center justify-between gap-11 border-b border-hair px-20 py-14">
        <span className="font-display text-panel-sm font-bold text-ink">
          This week
        </span>
        <span className="inline-flex items-center border border-dashed border-rule px-6 py-2 font-mono text-micro leading-none font-medium text-mut">
          SAMPLE DATA
        </span>
      </div>
      <div className="relative grid grid-cols-5 divide-x divide-hair border-b border-hair">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className={cn(
              "relative flex items-center justify-center gap-6 py-14 text-dense font-medium",
              weekday === "fri" ? "bg-tint text-mut" : "text-ink",
            )}
          >
            {WEEKDAY_SHORT[weekday]}
            {weekday === "thu" ? (
              <span className="relative size-[10px]">
                <DaySquare
                  state="today"
                  size={10}
                  className="absolute inset-0"
                />
                <span
                  className={cn(
                    "absolute inset-0 flex",
                    POP,
                    thuPosted ? "scale-100 opacity-100" : "scale-50 opacity-0",
                  )}
                >
                  <DaySquare state="posted" size={10} />
                </span>
              </span>
            ) : (
              <DaySquare state={WEEK[weekday]} size={10} />
            )}
            {weekday === "thu" && (
              <span className="absolute inset-x-0 bottom-0 h-2 bg-acc" />
            )}
          </div>
        ))}
        {/* The chosen day's 2px bar: one element, moved by transform only. */}
        <span
          className={cn("absolute top-0 left-0 h-2 w-1/5 bg-ink", SLIDE)}
          style={{
            transform: `translateX(${PREVIEW_DAYS.indexOf(day) * 100}%)`,
          }}
        />
      </div>
      {/* Every day's content in one cell: the tallest sets the height, so a change of
          day is a cross-fade and nothing reflows. */}
      <div className="grid flex-1 content-start px-20 pt-16 pb-20">
        {["mon", "tue", "wed", "thu-posted"].map((key) => (
          <div
            key={key}
            className={cn(
              "[grid-area:1/1]",
              FADE,
              layer === key ? "opacity-100" : "opacity-0",
            )}
          >
            <DayHead {...DAYS[key]} />
            <div
              className={cn(
                SLIDE,
                key === "thu-posted" && layer !== key && "translate-y-[4px]",
              )}
            >
              <Lines lines={DAYS[key].lines} />
            </div>
          </div>
        ))}
        <div
          className={cn(
            "[grid-area:1/1]",
            FADE,
            layer === "thu-empty" ? "opacity-100" : "opacity-0",
          )}
        >
          <DayHead title="Thursday" meta="Today · not posted yet" />
          <p className="mt-11 border border-dashed border-hair2 px-11 py-8 text-dense text-mut">
            What did you do?
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-11 border-t border-hair px-20 py-11">
        <span className="text-dense text-body">
          Friday&rsquo;s weekly report
        </span>
        <StatusChip kind="report" value="draft" size="sm" />
      </div>
    </div>
  );
}

export function AuthBrandPanel({ className }) {
  const ref = useRef(null);
  const still = useReducedMotion();
  const step = usePreviewStep(ref, still);
  return (
    <aside
      ref={ref}
      aria-label="About WeeklyView"
      className={cn("border-r border-hair bg-tint", className)}
      style={GRID}
    >
      <div
        data-auth-block="brand"
        className="row-span-4 row-start-2 grid w-full max-w-[420px] grid-rows-subgrid justify-self-center"
      >
        {/* Level with "Back to home". */}
        <div className="row-start-1 flex min-h-[32px] items-start pb-24">
          <BrandMark className="h-[32px] text-[22px]" glyphSize={22} />
        </div>
        {/* Level with the form's panel, and as tall. */}
        <div aria-hidden="true" className="row-start-3 flex">
          <WeekPreview step={step} />
        </div>
        {/* Level with the form's links. */}
        <div className="row-start-4 pt-20">
          <p className="font-display text-sub font-bold text-ink">
            One short update a day.
          </p>
          <p className="mt-8 text-base text-body">
            Each person posts what they did, and Friday&rsquo;s weekly report
            builds itself from the five days.
          </p>
        </div>
      </div>
    </aside>
  );
}
