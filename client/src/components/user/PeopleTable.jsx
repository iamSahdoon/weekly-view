import { Link } from "react-router-dom";
import { weekNumberLabel } from "../../lib/dates.js";
import { formatDateTime } from "../../lib/format.js";
import { personWeekHref } from "../../lib/dashboardParams.js";
import { RoleChip } from "../ui/RoleChip.jsx";
import { StatusChip } from "../ui/StatusChip.jsx";
import { Table } from "../ui/Table.jsx";
import { PersonCell } from "./PersonCell.jsx";

// The People table (design §3.15): person · role · projects · reports filed · last
// activity · status, and a link to the person's week this week — the same address Team
// updates uses (yours is `/reports/:week`, anyone else's `/people/:id/reports/:week`).
// The row opens the profile; the link inside it opens the week. An invited or removed
// person has no week to open.

const projectsOf = (user) =>
  user.projects.length ? user.projects.map((p) => p.name).join(", ") : "—";

export function PeopleTable({
  rows,
  meId,
  weekKey,
  sort,
  onSortChange,
  isFetching,
  isLoading,
  emptyState,
}) {
  const columns = [
    {
      id: "name",
      header: "Person",
      sortable: true,
      cell: (user) => <PersonCell person={user} avatar={22} />,
    },
    {
      id: "role",
      header: "Role",
      width: 110,
      mobile: "hidden",
      cell: (user) =>
        user.role === "member" ? (
          <span className="text-body">Member</span>
        ) : (
          <RoleChip role={user.role} />
        ),
    },
    {
      id: "projects",
      header: "Projects",
      mobile: "hidden",
      cell: (user) => (
        <span
          className="block max-w-[260px] truncate text-body"
          title={projectsOf(user)}
        >
          {projectsOf(user)}
        </span>
      ),
    },
    {
      id: "reportsFiled",
      header: "Reports filed",
      width: 130,
      align: "right",
      sortable: true,
      defaultDir: "desc",
      cell: (user) => user.reportsFiled,
    },
    {
      id: "lastActivityAt",
      header: "Last activity",
      width: 160,
      sortable: true,
      defaultDir: "desc",
      mono: true,
      mobile: "hidden",
      cell: (user) =>
        user.lastActivityAt ? formatDateTime(user.lastActivityAt) : "—",
    },
    {
      id: "week",
      header: "This week",
      width: 110,
      label: "Week",
      cell: (user) =>
        user.status === "active" ? (
          <Link
            to={personWeekHref(user._id, meId, weekKey)}
            className="font-mono text-caption text-acc-txt underline-offset-2 hover:underline"
            aria-label={`${user.name}’s week ${weekNumberLabel(weekKey).slice(1)}`}
          >
            {weekNumberLabel(weekKey)}
          </Link>
        ) : (
          <span className="text-mut">—</span>
        ),
    },
    {
      id: "status",
      header: "Status",
      width: 110,
      align: "right",
      mobile: "status",
      cell: (user) => <StatusChip kind="user" value={user.status} />,
    },
  ];
  return (
    <Table
      columns={columns}
      rows={rows}
      getRowHref={(user) => `/people/${user._id}`}
      sort={sort}
      onSortChange={onSortChange}
      isFetching={isFetching}
      isLoading={isLoading}
      emptyState={emptyState}
      keepHeader
      caption="People"
    />
  );
}
