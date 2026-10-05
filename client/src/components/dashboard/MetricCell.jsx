import { cn } from "../../lib/cn.js";

// One cell of the dashboard's metric strip (design §7.1). The label is the question, the
// number the answer; no icon, no delta arrow, and no colour except where the number is a
// status count (`tone="corr"`). The sub-line is omitted when there is no honest breakdown.
//
//   label  "Filed this week"      value  "9"      unit  "/ 12" (20px --mut beside it)
//   sub    a node — numerals in mono belong to the caller (`<Num>`)

export function MetricCell({ label, value, unit, sub, tone = "default" }) {
  return (
    <div className="flex min-h-[92px] min-w-0 flex-col justify-center bg-card px-24 py-20">
      <span className="text-caption font-medium text-mut">{label}</span>
      <span className="mt-4 flex items-baseline gap-6">
        <span
          className={cn(
            "font-display text-metric font-bold text-ink tabular-nums",
            tone === "corr" && "text-st-corr-fg",
          )}
        >
          {value}
        </span>
        {unit && (
          <span className="font-display text-sub font-bold text-mut tabular-nums">
            {unit}
          </span>
        )}
      </span>
      {sub && <span className="mt-4 text-caption text-mut">{sub}</span>}
    </div>
  );
}

/** A numeral inside a sub-line: mono (design §0.5). */
export const Num = ({ children }) => (
  <span className="font-mono text-body tabular-nums">{children}</span>
);
