import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { WEEKDAYS, WEEKDAY_SHORT } from "../../lib/constants.js";
import { cn } from "../../lib/cn.js";
import { DaySquare } from "../dashboard/UpdatesCell.jsx";
import { BrandMark } from "../shell/BrandMark.jsx";
import { StatusChip } from "../ui/StatusChip.jsx";
import { PANEL_INTROS } from "./panelIntros.js";
import {
  FINAL_STEP,
  PREVIEW_DAYS,
  PREVIEW_STEPS,
  previewLayer,
} from "./previewSteps.js";

// The auth screens' brand panel (owner decisions, auth pages 2026-10-17; design §3.12): on the
// left from 1024px, on --tint with a faint --hair grid that drifts one cell every 48 s. One
// 420px block, the form block's twin on AuthLayout's shared rows: the wordmark level with
// "Back to home"; beside the heading and the form panel, the screen's own line (`intro`,
// panelIntros.js) and a sample week in the app's own style at its natural height, its bottom
// level with the form panel's; the caption level with the form's links.
//
// The sample week loops (design §8.5 entry 32, an owner-approved exception to §8.4, on these
// screens only): the chosen day moves Monday → Thursday every 3 s; the old day's content
// fades out, then the new one fades in (180 ms each, never both legible); on Thursday
// ("today") the square fills and two lines appear; then it starts again. One timer,
// opacity and transform only. It and the grid wait while the tab is hidden or the panel is
// out of view (the phone layout hides it); under reduced motion neither moves and the
// posted Thursday is shown. Decorative (aria-hidden); the line and caption are real text.
// Nothing here takes focus or moves the form.

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

// The hairline grid: --hair lines on --tint, 32px apart, on one layer one cell larger than
// the panel so the drift (wv-grid-drift, base.css) loops seamlessly.
const GRID = {
  backgroundImage:
    "linear-gradient(var(--hair) 1px, transparent 1px), linear-gradient(90deg, var(--hair) 1px, transparent 1px)",
  backgroundSize: "32px 32px",
};

// A change of day, in three moves that never overlap: the outgoing day fades out (0–160
// ms), the chosen-day bar slides while the card is nearly blank (140–340 ms), then the
// incoming day fades in (240–420 ms). So two days are never legible at once, and the bar
// is never under one day while another is showing.
const FADE_IN =
  "opacity-100 transition-opacity duration-[180ms] delay-[240ms] ease-[var(--ease-out)]";
const FADE_OUT =
  "opacity-0 transition-opacity duration-[160ms] delay-0 ease-[var(--ease-in)]";
const BAR =
  "transition-transform duration-[200ms] delay-[140ms] ease-[var(--ease-out)]";
// The incoming lines rise 4px with the fade.
const LIFT =
  "transition-transform duration-[180ms] delay-[240ms] ease-[var(--ease-out)]";
// Thursday's square: a fade and a small scale together (one transition list — two
// transition classes would merge into one), in step with the incoming content.
const POP =
  "transition-[opacity,scale] duration-[180ms] delay-[240ms] ease-[var(--ease-out)]";

/** Whether the panel is worth animating: on screen (not hidden by the phone layout) and the tab visible. */
function usePanelActive(ref) {
  const [inView, setInView] = useState(
    typeof IntersectionObserver === "undefined",
  );
  const [visible, setVisible] = useState(
    () => typeof document === "undefined" || !document.hidden,
  );
  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) =>
            setInView(entry.isIntersecting),
          );
    observer?.observe(ref.current);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      observer?.disconnect();
    };
  }, [ref]);
  return inView && visible;
}

// Highlighted grid cells (round five): eight cells of the drifting layer, each lighting
// to 12% --acc once per 14 s drift in one of four turns (wv-cell-0…3, base.css), so two are
// lit at a time. They share the layer's clock — mounted with it, paused with it, dark
// whenever it loops — so they move with the lines and never jump. Where they sit is
// measured once and on resize (no per-frame work): cells whose whole drift stays inside
// the panel and clear of the brand block, so none ever sits behind text or a card.
const CELL = 32;
const CELL_COUNT = 8;

function useFreeCells(panelRef, blockRef) {
  const [cells, setCells] = useState([]);
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return undefined;
    const panel = panelRef.current;
    const block = blockRef.current;
    const place = () => {
      const p = panel.getBoundingClientRect();
      const b = block.getBoundingClientRect();
      if (!p.width) return setCells([]);
      const avoid = {
        left: b.left - p.left - CELL,
        right: b.right - p.left + CELL,
        top: b.top - p.top - CELL,
        bottom: b.bottom - p.top + CELL,
      };
      const free = [];
      // Cell (c, r) of the layer spans [32c − 32, 32c + 32] in the panel over one drift;
      // keep a cell's width in from every panel edge, so none is cut off by it.
      for (let c = 2; CELL * (c + 2) <= p.width; c += 1) {
        for (let r = 2; CELL * (r + 2) <= p.height; r += 1) {
          const [x0, x1, y0, y1] = [
            CELL * (c - 1),
            CELL * (c + 1),
            CELL * (r - 1),
            CELL * (r + 1),
          ];
          const clear =
            x1 <= avoid.left ||
            x0 >= avoid.right ||
            y1 <= avoid.top ||
            y0 >= avoid.bottom;
          if (clear) free.push([c, r]);
        }
      }
      // A fixed, even scatter (golden-ratio steps): stable, and no two turns side by side.
      const chosen = new Map();
      for (let i = 0; chosen.size < Math.min(CELL_COUNT, free.length); i += 1) {
        const at = free[Math.floor(((i * 0.618034) % 1) * free.length)];
        chosen.set(at.join(","), at);
      }
      setCells([...chosen.values()]);
    };
    const observer = new ResizeObserver(place);
    observer.observe(panel);
    observer.observe(block);
    return () => observer.disconnect();
  }, [panelRef, blockRef]);
  return cells;
}

/** The step to show: one timer, set only while the panel is active and motion is allowed. */
function usePreviewStep(active, still) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (still || !active) return undefined;
    const timer = setTimeout(
      () => setStep((current) => (current + 1) % PREVIEW_STEPS.length),
      PREVIEW_STEPS[step].ms,
    );
    return () => clearTimeout(timer);
  }, [active, still, step]);
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
    <div className="border border-hair bg-card">
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
              "flex items-center justify-center gap-6 py-14 text-dense font-medium",
              weekday === "fri" ? "bg-tint text-mut" : "text-ink",
            )}
          >
            {WEEKDAY_SHORT[weekday]}
            {weekday === "thu" ? (
              // Today: the hollow square, which fills once Thursday is posted.
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
          </div>
        ))}
        {/* The chosen day: the one 2px --ink bar, moved by transform only. It is the only
            mark of selection (no "today" underline), so one tab looks chosen at a time. */}
        <span
          data-preview-bar=""
          className={cn("absolute top-0 left-0 h-2 w-1/5 bg-ink", BAR)}
          style={{
            transform: `translateX(${PREVIEW_DAYS.indexOf(day) * 100}%)`,
          }}
        />
      </div>
      {/* Every day's content in one cell: the tallest sets the height, so a change of
          day is a fade and nothing reflows. */}
      <div className="grid px-20 pt-16 pb-20">
        {["mon", "tue", "wed", "thu-posted"].map((key) => (
          <div
            key={key}
            data-preview-layer={key}
            className={cn(
              "[grid-area:1/1]",
              layer === key ? FADE_IN : FADE_OUT,
            )}
          >
            <DayHead {...DAYS[key]} />
            <div
              className={cn(
                LIFT,
                key === "thu-posted" && layer !== key && "translate-y-[4px]",
              )}
            >
              <Lines lines={DAYS[key].lines} />
            </div>
          </div>
        ))}
        <div
          data-preview-layer="thu-empty"
          className={cn(
            "[grid-area:1/1]",
            layer === "thu-empty" ? FADE_IN : FADE_OUT,
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

/**
 * The screen's own line under the wordmark — a title and a sentence, or three steps — on a
 * card drawn like the sample card (round five), so it reads cleanly over the grid.
 */
function Intro({ intro }) {
  const copy = PANEL_INTROS[intro];
  if (!copy) return null;
  return (
    <div
      key={intro}
      data-panel-intro={intro}
      className="wv-fade-in border border-hair bg-card px-20 py-16"
    >
      <p className="font-display text-panel font-bold text-ink">{copy.title}</p>
      {copy.line && <p className="mt-8 text-base text-body">{copy.line}</p>}
      {copy.steps && (
        <ol className="mt-20 flex flex-col gap-20">
          {copy.steps.map(([step, note], i) => (
            <li key={step} className="flex gap-14">
              <span className="flex size-[24px] shrink-0 items-center justify-center border border-hair2 bg-card font-mono text-caption text-ink">
                {i + 1}
              </span>
              <span>
                <span className="block text-dense font-medium text-ink">
                  {step}
                </span>
                <span className="block text-dense text-mut">{note}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function AuthBrandPanel({ intro, className }) {
  const ref = useRef(null);
  const blockRef = useRef(null);
  const still = useReducedMotion();
  const active = usePanelActive(ref);
  const step = usePreviewStep(active, still);
  const cells = useFreeCells(ref, blockRef);
  return (
    <aside
      ref={ref}
      aria-label="About WeeklyView"
      data-paused={active ? undefined : ""}
      className={cn(
        "wv-auth-fade relative overflow-hidden border-r border-hair bg-tint",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="wv-grid-drift pointer-events-none absolute -top-[32px] right-0 bottom-0 -left-[32px]"
        style={GRID}
      >
        {/* Always eight, mounted with the layer, so their clock is the layer's; a cell
            with no free place waits hidden. */}
        {Array.from({ length: CELL_COUNT }, (_, i) => {
          const at = cells[i];
          return (
            <span
              key={i}
              data-turn={i % 4}
              className="wv-grid-cell"
              style={
                at
                  ? { left: CELL * at[0] + 1, top: CELL * at[1] + 1 }
                  : { visibility: "hidden" }
              }
            />
          );
        })}
      </div>
      <div
        ref={blockRef}
        data-auth-block="brand"
        className="relative row-span-4 row-start-2 grid w-full max-w-[420px] grid-rows-subgrid justify-self-center"
      >
        {/* Level with "Back to home". */}
        <div
          className="wv-stagger row-start-1 flex min-h-[32px] items-start pb-24"
          style={{ "--stagger": 0 }}
        >
          <BrandMark className="h-[32px] text-[22px]" glyphSize={22} />
        </div>
        {/* Beside the heading and the form panel: the screen's line, then the sample card
            at its own height, its bottom level with the form panel's (the column is a
            flex column whose last item ends at the row's end). */}
        <div className="row-span-2 row-start-2 flex flex-col">
          {/* The two cards keep one 24px gap on every screen; any room the form leaves
              goes above them, beside the form's heading. */}
          <div className="wv-stagger mt-auto pb-24" style={{ "--stagger": 1 }}>
            <Intro intro={intro} />
          </div>
          <div
            aria-hidden="true"
            className="wv-stagger"
            style={{ "--stagger": 2 }}
          >
            <WeekPreview step={step} />
          </div>
        </div>
        {/* Level with the form's links. */}
        <div
          className="wv-stagger row-start-4 pt-20"
          style={{ "--stagger": 3 }}
        >
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
