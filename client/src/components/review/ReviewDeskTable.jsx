import { weekNumberLabel } from "../../lib/dates.js";
import { formatDateTime, formatRelative } from "../../lib/format.js";
import { Avatar } from "../ui/Avatar.jsx";
import { NewMarker } from "../ui/NewMarker.jsx";
import { RoleChip } from "../ui/RoleChip.jsx";
import { StatusChip } from "../ui/StatusChip.jsx";
import { Table } from "../ui/Table.jsx";
import { Tooltip } from "../ui/Tooltip.jsx";

// The review desk's rows (design §3.5): who, which projects, which week, when it was
// submitted (relative, with the exact time on hover), how many versions, whether approval
// was asked, and the status. A "new" dot before the name marks a request this manager
// hasn't opened. Pure rendering from V3's items; the page owns the link state.

const projectsOf = (row) =>
  row.projects.length ? row.projects.map((p) => p.name).join(", ") : "—";

const COLUMNS = [
  {
    id: "person",
    header: "Person",
    cell: (row) => (
      <span className="inline-flex items-center gap-8">
        {row.isNew && <NewMarker />}
        <Avatar name={row.author.name} size={22} />
        <span>{row.author.name}</span>
        <RoleChip role={row.author.role} />
      </span>
    ),
  },
  {
    id: "projects",
    header: "Projects",
    mobile: "hidden",
    cell: (row) => (
      <span
        className="block max-w-[300px] truncate text-body"
        title={projectsOf(row)}
      >
        {projectsOf(row)}
      </span>
    ),
  },
  {
    id: "weekKey",
    header: "Week",
    width: 90,
    sortable: true,
    defaultDir: "desc",
    mono: true,
    cell: (row) => weekNumberLabel(row.weekKey),
  },
  {
    id: "submittedAt",
    header: "Submitted",
    width: 150,
    sortable: true,
    defaultDir: "asc",
    mono: true,
    cell: (row) =>
      row.submittedAt ? (
        <Tooltip content={formatDateTime(row.submittedAt)}>
          <span>{formatRelative(row.submittedAt)}</span>
        </Tooltip>
      ) : (
        "—"
      ),
  },
  {
    id: "revisionNumber",
    header: "Versions",
    width: 90,
    align: "right",
    mobile: "hidden",
    cell: (row) => row.revisionNumber,
  },
  {
    id: "asked",
    header: "Asked",
    width: 130,
    label: "Approval",
    cell: (row) =>
      row.approvalRequested ? (
        <span className="text-micro text-mut">Approval asked</span>
      ) : (
        <span className="text-mut">—</span>
      ),
  },
  {
    id: "status",
    header: "Status",
    width: 130,
    align: "right",
    mobile: "status",
    cell: (row) => <StatusChip value={row.status} />,
  },
];

const deskRowHref = (row) => `/review/${row._id}`;

export function ReviewDeskTable(props) {
  return (
    <Table
      columns={COLUMNS}
      getRowHref={deskRowHref}
      tour="review-desk"
      {...props}
    />
  );
}
