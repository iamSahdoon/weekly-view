import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  startOfISOWeek,
  startOfMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addWeeks,
  compareWeekKeys,
  currentWeekKey,
  toCalendarDate,
  weekKeyOf,
  weekStartOf,
} from "../../lib/dates.js";
import { formatWeekLabel } from "../../lib/format.js";
import { cn } from "../../lib/cn.js";
import { Popover } from "./Popover.jsx";
import { Tooltip } from "./Tooltip.jsx";

// Design §6.5: a first-class week control, not a date input.
//   [ ‹ ]  W38 · 14–18 Sep  [ › ]
// 38px tall, three segments divided by 1px --hair; the label is mono 12px. The
// popover is a Mon–Fri five-column grid — weekends are not rendered — whose rows
// are whole-week targets. ←/→ (and ↑/↓) step weeks, Enter selects, Esc closes.
//
//   value / min / max   weekKeys; weeks outside [min, max] are disabled
//   holidays            { "YYYY-MM-DD": name } — a --hair2 underline and a tooltip
//   reportedWeeks       { weekKey: status } — a 3px square in the left gutter
//                       (--acc; approved weeks --st-appr-fg)

const DAY_HEADS = ["M", "T", "W", "T", "F"];

export function WeekPicker({
  value,
  onChange,
  min,
  max,
  holidays = {},
  reportedWeeks = {},
  disabled = false,
  className,
}) {
  const [open, setOpen] = useState(false);
  const earliest = min ?? null;
  const latest = max ?? currentWeekKey();

  const allowed = (weekKey) =>
    (!earliest || compareWeekKeys(weekKey, earliest) >= 0) &&
    compareWeekKeys(weekKey, latest) <= 0;

  const prev = addWeeks(value, -1);
  const next = addWeeks(value, 1);

  const arrow = "touch-target h-full w-32 border-0 max-md:w-44";
  return (
    <div
      className={cn(
        "inline-flex h-[var(--ctrl-h)] items-stretch divide-x divide-hair border border-rule bg-card",
        className,
      )}
    >
      <ArrowButton
        label="Previous week"
        disabled={disabled || !allowed(prev)}
        onClick={() => onChange(prev)}
        className={arrow}
      >
        <ChevronLeft aria-hidden="true" />
      </ArrowButton>
      <Popover
        open={open}
        onOpenChange={setOpen}
        className="w-[280px]"
        align="center"
        trigger={
          <button
            type="button"
            disabled={disabled}
            aria-haspopup="dialog"
            className="focus-inset px-14 font-mono text-caption whitespace-nowrap text-ink tabular-nums transition-colors duration-[120ms] ease-linear enabled:hover:bg-tint disabled:cursor-not-allowed disabled:bg-tint2 disabled:text-mut"
          >
            {formatWeekLabel(value)}
          </button>
        }
      >
        <WeekGrid
          value={value}
          allowed={allowed}
          holidays={holidays}
          reportedWeeks={reportedWeeks}
          earliest={earliest}
          latest={latest}
          onSelect={(weekKey) => {
            onChange(weekKey);
            setOpen(false);
          }}
        />
      </Popover>
      <ArrowButton
        label="Next week"
        disabled={disabled || !allowed(next)}
        onClick={() => onChange(next)}
        className={arrow}
      >
        <ChevronRight aria-hidden="true" />
      </ArrowButton>
    </div>
  );
}

function ArrowButton({ label, disabled, onClick, className, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "focus-inset relative inline-flex items-center justify-center text-body [&_svg]:size-[16px]",
        "transition-colors duration-[120ms] ease-linear enabled:hover:bg-tint enabled:hover:text-ink enabled:active:bg-tint2",
        "disabled:cursor-not-allowed disabled:bg-tint2 disabled:text-mut",
        className,
      )}
    >
      {children}
    </button>
  );
}

function weeksOfMonth(viewMonth) {
  const last = endOfMonth(viewMonth);
  const rows = [];
  let monday = startOfISOWeek(startOfMonth(viewMonth));
  while (monday <= last) {
    const days = Array.from({ length: 5 }, (_, i) => addDays(monday, i));
    // A row with no weekday in this month (the 1st is a weekend) is skipped.
    if (days.some((d) => d.getMonth() === viewMonth.getMonth())) {
      rows.push({ weekKey: weekKeyOf(monday), days });
    }
    monday = addDays(monday, 7);
  }
  return rows;
}

function WeekGrid({
  value,
  allowed,
  holidays,
  reportedWeeks,
  earliest,
  latest,
  onSelect,
}) {
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(weekStartOf(value)),
  );
  const [active, setActive] = useState(value);
  const rowRefs = useRef({});
  const mounted = useRef(false);
  const current = currentWeekKey();
  const rows = useMemo(() => weeksOfMonth(viewMonth), [viewMonth]);

  // Keep focus on the active row as the arrows move it; not on first mount, where
  // Radix places focus.
  useEffect(() => {
    if (mounted.current) rowRefs.current[active]?.focus();
    mounted.current = true;
  }, [active]);

  const stepMonth = (delta) => setViewMonth((m) => addMonths(m, delta));
  const canStepMonth = (delta) => {
    const target = addMonths(viewMonth, delta);
    const firstWeek = weeksOfMonth(target);
    if (delta < 0) {
      const lastRow = firstWeek.at(-1);
      return !earliest || compareWeekKeys(lastRow.weekKey, earliest) >= 0;
    }
    return compareWeekKeys(firstWeek[0].weekKey, latest) <= 0;
  };

  const moveActive = (delta) => {
    const target = addWeeks(active, delta);
    if (!allowed(target)) return;
    setActive(target);
    setViewMonth(startOfMonth(addDays(weekStartOf(target), 2)));
  };

  const onKeyDown = (event) => {
    const steps = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };
    if (event.key in steps) {
      event.preventDefault();
      moveActive(steps[event.key]);
    }
  };

  return (
    <div onKeyDown={onKeyDown}>
      <div className="flex h-44 items-center justify-between border-b border-hair px-8">
        <MonthButton
          label="Previous month"
          disabled={!canStepMonth(-1)}
          onClick={() => stepMonth(-1)}
        >
          <ChevronLeft aria-hidden="true" />
        </MonthButton>
        <p aria-live="polite" className="text-dense font-medium text-ink">
          {format(viewMonth, "MMMM yyyy")}
        </p>
        <MonthButton
          label="Next month"
          disabled={!canStepMonth(1)}
          onClick={() => stepMonth(1)}
        >
          <ChevronRight aria-hidden="true" />
        </MonthButton>
      </div>
      <div className="p-8">
        <div
          aria-hidden="true"
          className="grid grid-cols-[8px_repeat(5,1fr)] pb-4 text-micro text-mut"
        >
          <span />
          {DAY_HEADS.map((d, i) => (
            <span key={i} className="text-center">
              {d}
            </span>
          ))}
        </div>
        <div role="listbox" aria-label="Weeks" className="flex flex-col">
          {rows.map(({ weekKey, days }) => {
            const selected = weekKey === value;
            const enabled = allowed(weekKey);
            const reported = reportedWeeks[weekKey];
            return (
              <button
                key={weekKey}
                ref={(el) => (rowRefs.current[weekKey] = el)}
                type="button"
                role="option"
                aria-selected={selected}
                aria-disabled={!enabled || undefined}
                aria-label={formatWeekLabel(weekKey)}
                tabIndex={weekKey === active ? 0 : -1}
                onClick={() => enabled && onSelect(weekKey)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && enabled) {
                    event.preventDefault();
                    onSelect(weekKey);
                  }
                }}
                className={cn(
                  "focus-inset relative grid h-32 grid-cols-[8px_repeat(5,1fr)] items-center border-l-2 text-dense tabular-nums",
                  selected ? "border-acc bg-acc-l" : "border-transparent",
                  enabled
                    ? "text-ink hover:bg-tint"
                    : "cursor-not-allowed text-mut",
                  selected && enabled && "hover:bg-acc-l",
                )}
              >
                <span className="flex justify-center">
                  {reported && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-[3px]",
                        reported === "approved" ? "bg-st-appr-fg" : "bg-acc",
                      )}
                    />
                  )}
                </span>
                {days.map((day) => (
                  <DayNumber
                    key={toCalendarDate(day)}
                    day={day}
                    inMonth={day.getMonth() === viewMonth.getMonth()}
                    holiday={holidays[toCalendarDate(day)]}
                    isCurrentWeek={weekKey === current}
                  />
                ))}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DayNumber({ day, inMonth, holiday, isCurrentWeek }) {
  const number = (
    <span
      className={cn(
        "justify-self-center",
        !inMonth && "text-mut",
        holiday && "text-mut underline decoration-hair2 underline-offset-4",
        isCurrentWeek &&
          "underline decoration-acc decoration-dashed underline-offset-4",
      )}
    >
      {format(day, "d")}
    </span>
  );
  return holiday ? <Tooltip content={holiday}>{number}</Tooltip> : number;
}

function MonthButton({ label, disabled, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="focus-inset relative inline-flex size-32 items-center justify-center text-body transition-colors duration-[120ms] ease-linear enabled:hover:bg-tint enabled:hover:text-ink disabled:cursor-not-allowed disabled:text-mut [&_svg]:size-[16px]"
    >
      {children}
    </button>
  );
}
