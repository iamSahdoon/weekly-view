import { weekNumberLabel } from "../../lib/dates.js";
import {
  formatDateTime,
  formatHours,
  formatWeekRange,
} from "../../lib/format.js";
import { NewMarker } from "../ui/NewMarker.jsx";
import { StatusChip } from "../ui/StatusChip.jsx";
import { Table } from "../ui/Table.jsx";

// "My reports" (design §3.3): one row per week the person has a report for. Draft and
// Needs-correction rows open the form and carry a small `Editable` hint; the rest open
// the week. A "new" dot sits before the week id; a week that asked for approval says so
// beside its chip until it is approved or sent back. Pure rendering from R1's rows.

const isEditableRow = (row) =>
  row.status === "draft" || row.status === "needs_correction";

const hrefOfRow = (row) =>
  isEditableRow(row)
    ? `/reports/${row.weekKey}/edit`
    : `/reports/${row.weekKey}`;

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
      row.tasksDone == null ? (
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
    cell: (row) => formatHours(row.hours),
  },
  {
    id: "revisionNumber",
    header: "Versions",
    width: 100,
    align: "right",
    mobile: "hidden",
    cell: (row) => (row.revisionNumber > 0 ? row.revisionNumber : "—"),
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
    width: 230,
    align: "right",
    mobile: "status",
    cell: (row) => (
      <span className="inline-flex items-center justify-end gap-11">
        {isEditableRow(row) && (
          <span className="text-micro whitespace-nowrap text-mut">
            Editable
          </span>
        )}
        {row.status === "submitted" && row.approvalRequested && (
          <span className="text-micro whitespace-nowrap text-mut">
            Approval asked
          </span>
        )}
        <StatusChip value={row.status} />
      </span>
    ),
  },
];

export function ReportHistoryTable({ columns = COLUMNS, ...props }) {
  return (
    <Table
      columns={columns}
      getRowHref={hrefOfRow}
      tour="report-history"
      {...props}
    />
  );
}
