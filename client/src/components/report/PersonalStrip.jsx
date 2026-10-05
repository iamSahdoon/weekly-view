import { formatHours } from "../../lib/format.js";

// The personal strip on This week (design §3.1, metric type §7.1): one panel, three
// cells divided by hairlines, the label above the number. Factual, never evaluative —
// no streaks, scores or approval rates. `summary` is R2's.

export function PersonalStrip({ summary }) {
  const cells = [
    ["Weeks filed", String(summary.weeksFiled)],
    ["Hours logged this month", formatHours(summary.hoursThisMonth)],
    ["Open blockers", String(summary.openBlockers)],
  ];
  return (
    <section
      aria-label="Your numbers"
      className="grid grid-cols-3 divide-x divide-hair border border-hair bg-card"
    >
      {cells.map(([label, value]) => (
        <div key={label} className="flex min-w-0 flex-col gap-8 px-20 py-16">
          <span className="text-caption font-medium text-mut">{label}</span>
          <span className="font-display text-metric-sm font-bold text-ink tabular-nums">
            {value}
          </span>
        </div>
      ))}
    </section>
  );
}
