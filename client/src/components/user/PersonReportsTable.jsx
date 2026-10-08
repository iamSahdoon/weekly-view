import { weekNumberLabel } from "../../lib/dates.js";
import { personWeekHref } from "../../lib/dashboardParams.js";
import {
  formatDateTime,
  formatHours,
  formatWeekRange,
} from "../../lib/format.js";
import { NewMarker } from "../ui/NewMarker.jsx";
import { StatusChip } from "../ui/StatusChip.jsx";
import { Table } from "../ui/Table.jsx";

// Someone's every week on the team (design §3.8, U7): a row per week, not only the weeks
// with a report. A report's row opens that person's week (read-only: `/people/:id/reports/
// :week`, Draft included); a week with nothing filed, an away week or an all-holiday week
// is a `WeekRow` — its chip and `—`, and not a link, because there is nothing behind it.
// The chips are the app's one status family (Draft … Approved, Not started, On leave,
// Holiday week).

const isReport = (row) => row._id !== null;
const projectsOf = (row) =>
  row.projects.length ? row.projects.map((p) => p.name).join(", ") : "—";

const COLUMNS = [
  {
    id: "weekKey",
    header: "Week",
    width: 120,
    sortable: true,
    defaultDir: "desc",
    cell: (row) => (
      <span className="inline-flex items-center gap-8 font-mono text-caption text-ink">
        {row.isNew && <NewMarker />}
        {weekNumberLabel(row.weekKey)}
      </span>
    ),
  },
  {
    id: "dates",
    header: "Dates",
    width: 150,
    mono: true,
    cell: (row) => formatWeekRange(row.weekKey),
  },
  {
    id: "projects",
    header: "Projects",
    mobile: "hidden",
    cell: (row) => (
      <span
        className="block max-w-[320px] truncate text-body"
        title={projectsOf(row)}
      >
        {projectsOf(row)}
      </span>
    ),
  },
  {
    id: "tasks",
    header: "Tasks",
    width: 100,
    align: "right",
    cell: (row) =>
      !isReport(row) ? (
        "—"
      ) : row.tasksDone == null ? (
        <span className="font-mono text-caption text-mut">{row.taskCount}</span>
      ) : (
        <span className="font-mono text-caption text-ink">
          {row.tasksDone}
          <span className="text-mut"> / {row.taskCount}</span>
        </span>
      ),
  },
  {
    id: "hours",
    header: "Hours",
    width: 90,
    align: "right",
    cell: (row) => (isReport(row) ? formatHours(row.hours) : "—"),
  },
  {
    id: "lastActivityAt",
    header: "Last activity",
    width: 160,
    sortable: true,
    defaultDir: "desc",
    mono: true,
    mobile: "hidden",
    cell: (row) =>
      row.lastActivityAt ? formatDateTime(row.lastActivityAt) : "—",
  },
  {
    id: "status",
    header: "Status",
    width: 190,
    align: "right",
    mobile: "status",
    cell: (row) => (
      <span className="inline-flex items-center justify-end gap-11">
        {row.status === "submitted" && row.approvalRequested && (
          <span className="text-micro whitespace-nowrap text-mut">
            Approval asked
          </span>
        )}
        <StatusChip kind="week" value={row.status} />
      </span>
    ),
  },
];

export function PersonReportsTable({ userId, meId, ...props }) {
  return (
    <Table
      columns={COLUMNS}
      rowKey="weekKey"
      getRowHref={(row) =>
        isReport(row) ? personWeekHref(userId, meId, row.weekKey) : undefined
      }
      {...props}
    />
  );
}
