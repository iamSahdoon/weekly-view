import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/cn.js";
import { currentWeekKey, weekNumberLabel } from "../../lib/dates.js";
import { Button } from "./Button.jsx";
import { Popover } from "./Popover.jsx";
import { WeekPicker } from "./WeekPicker.jsx";

// The "week range" slot of the filter bar (design §6.21): two week controls, From and
// To, drafted in a popover and committed by Apply, like the multi-select beside it.
// An end left unset is open (`Any week`). The trigger reads `Weeks` when unset and
// `Weeks: W34–W38` (or `from W34`, `to W38`) in --ink with a 1px --acc border when set.
//
//   from / to   weekKeys or null
//   onChange    ({ weekFrom, weekTo }) — both, so one URL write

const summaryOf = (from, to) => {
  if (!from && !to) return "Weeks";
  if (from && to) {
    return from === to
      ? `Weeks: ${weekNumberLabel(from)}`
      : `Weeks: ${weekNumberLabel(from)}–${weekNumberLabel(to)}`;
  }
  return from
    ? `Weeks: from ${weekNumberLabel(from)}`
    : `Weeks: to ${weekNumberLabel(to)}`;
};

function Bound({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-6">
      <span className="text-caption font-medium text-mut">{label}</span>
      {value ? (
        <div className="flex items-center gap-8">
          <WeekPicker value={value} onChange={onChange} />
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            Any week
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-11">
          <span className="text-dense text-mut">Any week</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onChange(currentWeekKey())}
          >
            Choose a week
          </Button>
        </div>
      )}
    </div>
  );
}

export function WeekRangeFilter({ from, to, onChange, className }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ from, to });
  const set = Boolean(from || to);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft({ from, to });
        setOpen(next);
      }}
      trigger={
        <Button
          variant="secondary"
          size="sm"
          aria-haspopup="dialog"
          className={cn(
            "justify-between gap-8",
            set && "border-acc text-ink enabled:hover:border-acc",
            className,
          )}
        >
          <span className="truncate">{summaryOf(from, to)}</span>
          <ChevronDown aria-hidden="true" className="size-[10px]!" />
        </Button>
      }
      className="w-[340px]"
    >
      <div className="flex flex-col gap-14 p-14">
        <Bound
          label="From week"
          value={draft.from}
          onChange={(next) => setDraft((d) => ({ ...d, from: next }))}
        />
        <Bound
          label="To week"
          value={draft.to}
          onChange={(next) => setDraft((d) => ({ ...d, to: next }))}
        />
      </div>
      <div className="flex items-center justify-between gap-8 border-t border-hair bg-tint p-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onChange({ weekFrom: null, weekTo: null });
            setOpen(false);
          }}
        >
          Clear
        </Button>
        <Button
          size="sm"
          onClick={() => {
            // A reversed pair is the same range, said the other way round.
            const [a, b] =
              draft.from && draft.to && draft.from > draft.to
                ? [draft.to, draft.from]
                : [draft.from, draft.to];
            onChange({ weekFrom: a, weekTo: b });
            setOpen(false);
          }}
        >
          Apply
        </Button>
      </div>
    </Popover>
  );
}
