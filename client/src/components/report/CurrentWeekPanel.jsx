import { Link } from "react-router-dom";
import {
  formatDateTime,
  formatHours,
  formatWeekRange,
} from "../../lib/format.js";
import { derivePanelAction } from "../../lib/weekActions.js";
import { Button } from "../ui/Button.jsx";
import { StatusChip } from "../ui/StatusChip.jsx";
import { SampleDataPill } from "../ui/SampleDataPill.jsx";

// "This week's report" on This week (design §3.1): the week, its range and status,
// a two-column definition grid, the newest overall comment, and the panel's button,
// named after the week's state (lib/weekActions.derivePanelAction).

const weekNumber = (weekKey) => Number(weekKey.slice(6));

function Value({ children }) {
  return children == null || children === "" ? (
    <span className="text-mut">—</span>
  ) : (
    children
  );
}

export function CurrentWeekPanel({ week }) {
  const report = week.report;
  const expected = week.expectedDays;
  const posted = expected.filter((d) => week.dayStates[d] === "posted").length;
  const hours = report?.days.reduce((sum, d) => sum + d.hours, 0);
  const projects = new Set(
    (report?.tasks ?? []).map((t) => t.task?.project?._id).filter(Boolean),
  );
  const keyBlocker = report?.days
    .flatMap((d) => d.blockers)
    .find((b) => b.isKey);
  const comments = report?.weekComments ?? [];
  const newest = [...comments].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )[0];
  const action = derivePanelAction(week);

  const rows = [
    ["Days posted", expected.length ? `${posted} of ${expected.length}` : null],
    ["Hours logged", report ? `${formatHours(hours)} h` : null],
    ["Tasks", report ? String(report.tasks.length) : null],
    ["Projects", report ? String(projects.size) : null],
    ["Key blocker", keyBlocker?.text ?? null],
    ["Last saved", report?.updatedAt ? formatDateTime(report.updatedAt) : null],
  ];

  return (
    <section
      aria-labelledby="current-week"
      className="flex flex-col border border-hair bg-card"
    >
      <header className="flex min-h-44 flex-wrap items-center justify-between gap-x-14 gap-y-4 border-b border-hair px-20 py-8">
        <div className="flex items-baseline gap-11">
          <h2
            id="current-week"
            className="font-display text-panel font-bold text-ink"
          >
            Week {weekNumber(week.weekKey)}
          </h2>
          <span className="font-mono text-micro text-mut">
            {formatWeekRange(week.weekKey)}
          </span>
          <SampleDataPill className="self-center" />
        </div>
        <div className="flex items-center gap-11">
          {report?.approvalRequested && (
            <span className="text-micro text-mut">Approval asked</span>
          )}
          <StatusChip kind="week" value={report?.status ?? week.state} />
        </div>
      </header>
      <div className="flex flex-col gap-20 p-20">
        <dl className="grid grid-cols-1 gap-x-24 gap-y-11 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex min-w-0 flex-col gap-2">
              <dt className="text-caption text-mut">{label}</dt>
              <dd
                className={
                  label === "Key blocker"
                    ? "text-dense break-words text-ink"
                    : "font-mono text-dense text-ink"
                }
              >
                <Value>{value}</Value>
              </dd>
            </div>
          ))}
        </dl>
        {newest && (
          <div className="flex flex-col gap-4 border-t border-hair pt-14">
            <p className="text-caption text-mut">
              {newest.author?.name}{" "}
              <span className="font-mono">
                {formatDateTime(newest.createdAt)}
              </span>
            </p>
            <p className="text-dense break-words whitespace-pre-line text-ink">
              {newest.text}
            </p>
            {comments.length > 1 && (
              <Link
                to={`/reports/${week.weekKey}`}
                className="text-dense text-body underline underline-offset-2 hover:text-ink"
              >
                + {comments.length - 1} more
              </Link>
            )}
          </div>
        )}
        {action && (
          <div>
            <Button variant="secondary" asChild>
              <Link to={action.to}>{action.label}</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
