import { motion as Motion } from "motion/react";
import { useId, useRef } from "react";
import { WEEKDAYS, WEEKDAY_SHORT } from "../../lib/constants.js";
import { cn } from "../../lib/cn.js";
import { formatHours } from "../../lib/format.js";
import { DaySquare } from "../dashboard/UpdatesCell.jsx";
import { NewMarker } from "../ui/NewMarker.jsx";
import { Tooltip } from "../ui/Tooltip.jsx";

// The five-day strip — the daily-update control (design §3.1, frontend_architecture.md
// §8.3). Five equal cells, Mon–Fri, 1px --hair dividers; each is a tab that opens its
// day in the panel beneath. Holiday, leave, not-on-team and future cells can't be
// chosen, and the arrow keys skip them. The strip itself is static (design §8.4: no
// sweep); only the chosen day's bar slides to the day you pick (polish, 2026-10-10:
// 180ms --ease-out, Motion layoutId; it jumps under reduced motion).
//
//   days      the report's posted days (for hours and comment counts), or []
//   holidays  { [weekday]: { name } }
//   size      "full" — 52px on This week; "summary" — 36px above the form

const SELECTABLE = new Set(["posted", "missing", "today"]);

function commentCount(day) {
  return day.comments.reduce((n, t) => n + 1 + t.replies.length, 0);
}

export function WeekStrip({
  dayStates,
  days = [],
  holidays = {},
  selected,
  onSelect,
  size = "full",
  panelId,
}) {
  const refs = useRef({});
  const group = useId();
  const selectable = WEEKDAYS.filter((d) => SELECTABLE.has(dayStates[d]));
  // One tab stop: the chosen day, or the first that can be chosen.
  const tabStop = selectable.includes(selected) ? selected : selectable[0];

  const onKeyDown = (event, weekday) => {
    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    let target = null;
    if (step) {
      const i = selectable.indexOf(weekday);
      target = selectable[(i + step + selectable.length) % selectable.length];
    } else if (event.key === "Home") target = selectable[0];
    else if (event.key === "End") target = selectable[selectable.length - 1];
    if (!target) return;
    event.preventDefault();
    onSelect(target);
    refs.current[target]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Days of the week"
      className={cn(
        "grid grid-cols-5 divide-x divide-hair border border-hair",
        size === "full" ? "h-[52px]" : "h-[36px]",
      )}
    >
      {WEEKDAYS.map((weekday) => {
        const state = dayStates[weekday];
        const day = days.find((d) => d.weekday === weekday);
        const canSelect = SELECTABLE.has(state);
        const isSelected = weekday === selected;
        return (
          <button
            key={weekday}
            ref={(node) => (refs.current[weekday] = node)}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls={isSelected ? panelId : undefined}
            aria-disabled={canSelect ? undefined : true}
            tabIndex={weekday === tabStop ? 0 : -1}
            onClick={() => canSelect && onSelect(weekday)}
            onKeyDown={(event) => onKeyDown(event, weekday)}
            className={cn(
              "focus-halo relative flex min-w-0 flex-col justify-center gap-2 px-11 text-left max-sm:items-center max-sm:px-4",
              CELL[state] ?? CELL.future,
              canSelect
                ? "cursor-pointer transition-colors duration-[120ms] ease-linear"
                : "cursor-default",
              canSelect && !isSelected && HOVER[state],
            )}
          >
            {/* The chosen day: a 2px --ink bar along the top. */}
            {isSelected && (
              <Motion.span
                layoutId={`week-strip-${group}`}
                aria-hidden="true"
                data-testid="strip-selected"
                className="absolute inset-x-0 top-0 h-2 bg-ink"
                transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
              />
            )}
            <span
              className={cn(
                "flex items-center gap-6 text-dense font-medium",
                state === "future" || state === "not_on_team"
                  ? "text-mut"
                  : "text-ink",
              )}
            >
              <span className="max-sm:hidden">{WEEKDAY_SHORT[weekday]}</span>
              <span aria-hidden="true" className="sm:hidden">
                {WEEKDAY_SHORT[weekday][0]}
              </span>
              <span className="sr-only sm:hidden">
                {WEEKDAY_SHORT[weekday]}
              </span>
              {/* The day's Updates square — the dashboard's shapes (polish). */}
              <DaySquare state={state ?? "future"} size={10} />
            </span>
            {size === "full" && (
              <CellDetail state={state} day={day} holiday={holidays[weekday]} />
            )}
            {state === "today" && (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-2 bg-acc"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

// A day you can open answers the pointer (polish, 2026-10-10).
const HOVER = {
  posted: "hover:bg-tint",
  missing: "hover:bg-st-corr-bg/70",
  today: "hover:bg-acc-l/70",
};

const CELL = {
  posted: "bg-card",
  missing: "bg-st-corr-bg",
  today: "bg-acc-l",
  leave: "bg-tint2",
  holiday: "bg-tint2",
  future: "bg-tint",
  not_on_team: "bg-tint",
};

function CellDetail({ state, day, holiday }) {
  const line = "truncate text-micro max-sm:hidden";
  if (state === "posted" && day) {
    const count = commentCount(day);
    const isNew = day.comments.some((t) => t.isNew);
    return (
      <span className={cn(line, "flex items-center gap-8 font-mono text-mut")}>
        <span className="text-body">{formatHours(day.hours)} h</span>
        {count > 0 && (
          <span className="inline-flex items-center gap-4">
            {isNew && <NewMarker />}
            {count}
            <span className="sr-only">
              {" "}
              {count === 1 ? "comment" : "comments"}
            </span>
          </span>
        )}
      </span>
    );
  }
  if (state === "missing")
    return <span className={cn(line, "text-st-corr-fg")}>Missing</span>;
  if (state === "today")
    return <span className={cn(line, "text-acc-txt")}>Today</span>;
  if (state === "leave")
    return <span className={cn(line, "text-mut")}>On leave</span>;
  if (state === "not_on_team")
    return <span className={cn(line, "text-mut")}>Not on the team</span>;
  if (state === "holiday") {
    const name = holiday?.name ?? "Holiday";
    return (
      <Tooltip content={name}>
        <span className={cn(line, "block text-mut")}>{name}</span>
      </Tooltip>
    );
  }
  return null;
}
