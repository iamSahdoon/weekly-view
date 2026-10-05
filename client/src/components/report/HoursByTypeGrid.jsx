import {
  TASK_TYPES,
  TASK_TYPE_COLORS,
  TASK_TYPE_LABELS,
} from "../../lib/constants.js";
import { formatHours } from "../../lib/format.js";

// Section 05 (design §4.6): calculated, never typed. Seven rows, each a 4px swatch in
// the type's chart colour, the label and the week's hours in mono, and a --tint2 total
// row. The same seven things, in the same colours, as the dashboard chart.

export function HoursByTypeGrid({ hoursByType }) {
  const total = TASK_TYPES.reduce((n, t) => n + (hoursByType?.[t] ?? 0), 0);
  return (
    <dl className="max-w-[560px] border border-hair">
      {TASK_TYPES.map((type) => (
        <div
          key={type}
          className="flex h-[36px] items-center gap-11 border-b border-hair pr-14"
        >
          <span
            aria-hidden="true"
            className="h-full w-[4px] shrink-0"
            style={{ background: TASK_TYPE_COLORS[type] }}
          />
          <dt className="flex-1 text-dense text-body">
            {TASK_TYPE_LABELS[type]}
          </dt>
          <dd className="font-mono text-dense text-ink tabular-nums">
            {formatHours(hoursByType?.[type] ?? 0)} h
          </dd>
        </div>
      ))}
      <div className="flex h-[36px] items-center justify-between bg-tint2 px-14">
        <dt className="text-dense font-medium text-ink">Total</dt>
        <dd className="font-mono text-dense font-medium text-ink tabular-nums">
          {formatHours(total)} h
        </dd>
      </div>
    </dl>
  );
}
