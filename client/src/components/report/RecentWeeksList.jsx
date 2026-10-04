import { Link } from "react-router-dom";
import { weekNumberLabel } from "../../lib/dates.js";
import { formatHours } from "../../lib/format.js";
import { NewMarker } from "../ui/NewMarker.jsx";
import { StatusChip } from "../ui/StatusChip.jsx";

// Recent weeks on This week (design §3.1): five 40px rows — the week id in mono, the
// hours in mono, a "new" marker when something on that week is unread, the status
// chip right — and an `All reports` link. `rows` are R1 ReportRows, newest first.

export function RecentWeeksList({ rows }) {
  return (
    <section
      aria-labelledby="recent-weeks"
      className="flex flex-col border border-hair bg-card"
    >
      <header className="flex h-44 items-center border-b border-hair px-20">
        <h2
          id="recent-weeks"
          className="font-display text-panel font-bold text-ink"
        >
          Recent weeks
        </h2>
      </header>
      {rows.length === 0 ? (
        <p className="px-20 py-14 text-dense text-mut">No earlier weeks yet.</p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((row) => (
            <li key={row._id} className="border-b border-hair last:border-b-0">
              <Link
                to={`/reports/${row.weekKey}`}
                className="flex h-[var(--row-h)] items-center gap-14 px-20 transition-colors duration-[120ms] ease-linear hover:bg-tint"
              >
                <span className="w-[44px] font-mono text-dense text-ink">
                  {weekNumberLabel(row.weekKey)}
                </span>
                <span className="font-mono text-dense text-body">
                  {formatHours(row.hours)} h
                </span>
                {row.isNew && <NewMarker />}
                <StatusChip value={row.status} size="sm" className="ml-auto" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <footer className="flex h-44 items-center border-t border-hair px-20">
        <Link
          to="/reports"
          className="text-dense text-body underline underline-offset-2 hover:text-ink"
        >
          All reports
        </Link>
      </footer>
    </section>
  );
}
