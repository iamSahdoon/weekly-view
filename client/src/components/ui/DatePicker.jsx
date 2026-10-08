import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  startOfISOWeek,
  startOfMonth,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { forwardRef, useState } from "react";
import { cn } from "../../lib/cn.js";
import { parseCalendarDate, toCalendarDate } from "../../lib/dates.js";
import { formatDateLong } from "../../lib/format.js";
import { inputClasses } from "./inputClasses.js";
import { Popover } from "./Popover.jsx";

// A date field whose calendar shows Monday to Friday only — a weekend can't be picked
// because it isn't there (design §3.9, §3.17; the WeekPicker's grid in single days).
// `value` and `onChange` are YYYY-MM-DD strings, as the API takes them (§1.8); the shown
// date is mono. `id` and the aria props come from `Field`. Every day is a real button,
// so Tab and Enter work.

const HEADS = ["M", "T", "W", "T", "F"];

function weeksOf(month) {
  const last = endOfMonth(month);
  const rows = [];
  let monday = startOfISOWeek(startOfMonth(month));
  while (monday <= last) {
    const days = Array.from({ length: 5 }, (_, i) => addDays(monday, i));
    if (days.some((d) => d.getMonth() === month.getMonth())) rows.push(days);
    monday = addDays(monday, 7);
  }
  return rows;
}

export const DatePicker = forwardRef(function DatePicker(
  {
    value,
    onChange,
    disabled = false,
    placeholder = "Pick a date",
    className,
    ...props
  },
  ref,
) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseCalendarDate(value) : null;
  const [month, setMonth] = useState(startOfMonth(selected ?? new Date()));
  const today = toCalendarDate(new Date());

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setMonth(startOfMonth(selected ?? new Date()));
        setOpen(next);
      }}
      className="w-[280px]"
      trigger={
        <button
          ref={ref}
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          className={cn(
            inputClasses,
            "flex h-[var(--ctrl-h)] items-center justify-between gap-8 text-left max-md:h-[var(--ctrl-h-lg)]",
            className,
          )}
          {...props}
        >
          <span
            className={cn(
              selected ? "font-mono text-caption text-ink" : "text-mut",
            )}
          >
            {selected ? formatDateLong(selected) : placeholder}
          </span>
          <CalendarDays aria-hidden="true" className="size-[14px] text-mut" />
        </button>
      }
    >
      <div className="p-8">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setMonth(addMonths(month, -1))}
            className="focus-inset size-28 inline-flex items-center justify-center text-body hover:bg-tint hover:text-ink"
          >
            <ChevronLeft aria-hidden="true" className="size-[14px]" />
          </button>
          <span className="font-mono text-caption text-ink">
            {format(month, "MMMM yyyy")}
          </span>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setMonth(addMonths(month, 1))}
            className="focus-inset size-28 inline-flex items-center justify-center text-body hover:bg-tint hover:text-ink"
          >
            <ChevronRight aria-hidden="true" className="size-[14px]" />
          </button>
        </div>
        <div className="grid grid-cols-5 gap-2 text-center" role="grid">
          {HEADS.map((head, i) => (
            <span
              key={i}
              className="py-4 text-micro text-mut"
              aria-hidden="true"
            >
              {head}
            </span>
          ))}
          {weeksOf(month)
            .flat()
            .map((date) => {
              const key = toCalendarDate(date);
              const inMonth = date.getMonth() === month.getMonth();
              const isSelected = key === value;
              return (
                <button
                  key={key}
                  type="button"
                  aria-label={format(date, "EEEE d MMMM yyyy")}
                  aria-pressed={isSelected}
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                  className={cn(
                    "focus-inset h-32 font-mono text-caption tabular-nums transition-colors duration-[120ms] ease-linear",
                    inMonth ? "text-ink" : "text-mut",
                    isSelected
                      ? "bg-acc text-on-acc"
                      : "hover:bg-tint active:bg-tint2",
                    key === today &&
                      !isSelected &&
                      "underline decoration-acc decoration-2 underline-offset-4",
                  )}
                >
                  {format(date, "d")}
                </button>
              );
            })}
        </div>
      </div>
    </Popover>
  );
});
