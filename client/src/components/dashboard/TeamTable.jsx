import { REPORT_STATUSES, WEEK_STATES } from "../../lib/constants.js";
import { formatDateTime, formatHours } from "../../lib/format.js";
import { teamRowHref } from "../../lib/dashboardData.js";
import { statusOf } from "../../lib/statusMaps.js";
import { Avatar } from "../ui/Avatar.jsx";
import { Button } from "../ui/Button.jsx";
import { EmptyState } from "../ui/EmptyState.jsx";
import { InlineError } from "../ui/InlineError.jsx";
import { MultiSelect } from "../ui/MultiSelect.jsx";
import { Pagination } from "../ui/Pagination.jsx";
import { QueryView } from "../ui/QueryView.jsx";
import { RoleChip } from "../ui/RoleChip.jsx";
import { StatusChip } from "../ui/StatusChip.jsx";
import { Table } from "../ui/Table.jsx";
import { UpdatesCell } from "./UpdatesCell.jsx";

// The team table (design §3.7): everyone who files is a row — managers and admins too.
// Its own header carries the status filter, so it visibly filters this table and nothing
// else. Row click: the review page when the report is Submitted and someone else's,
// otherwise that person's week (design §3.4) — your own at /reports (`teamRowHref`). A Draft shows its hours as posted.

const STATUS_VALUES = [...WEEK_STATES, ...REPORT_STATUSES];
const STATUS_OPTIONS = STATUS_VALUES.map((value) => ({
  value,
  label: statusOf("week", value).label,
}));

const projectsOf = (row) =>
  row.projects.length ? row.projects.map((p) => p.name).join(", ") : "—";

const COLUMNS = [
  {
    id: "name",
    header: "Person",
    sortable: true,
    cell: (row) => (
      <span className="inline-flex items-center gap-8">
        <Avatar name={row.user.name} size={22} />
        <span>{row.user.name}</span>
        <RoleChip role={row.user.role} />
      </span>
    ),
  },
  {
    id: "updates",
    header: "Updates",
    width: 150,
    cell: (row) => <UpdatesCell dayStates={row.dayStates} />,
  },
  {
    id: "projects",
    header: "Projects",
    mobile: "hidden",
    cell: (row) => (
      <span
        className="block max-w-[280px] truncate text-body"
        title={projectsOf(row)}
      >
        {projectsOf(row)}
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    width: 150,
    sortable: true,
    mobile: "status",
    cell: (row) => <StatusChip kind="week" value={row.state} />,
  },
  {
    id: "asked",
    header: "Asked",
    width: 130,
    label: "Approval",
    mobile: "hidden",
    cell: (row) =>
      row.approvalRequested && row.state === "submitted" ? (
        <span className="text-micro whitespace-nowrap text-mut">
          Approval asked
        </span>
      ) : (
        <span className="text-mut">—</span>
      ),
  },
  {
    id: "versions",
    header: "Versions",
    width: 90,
    align: "right",
    mobile: "hidden",
    cell: (row) =>
      row.report?.revisionNumber > 0 ? row.report.revisionNumber : "—",
  },
  {
    id: "hours",
    header: "Hours",
    width: 80,
    align: "right",
    cell: (row) => formatHours(row.hours),
  },
  {
    id: "lastActivityAt",
    header: "Last activity",
    width: 150,
    sortable: true,
    defaultDir: "desc",
    mono: true,
    mobile: "hidden",
    cell: (row) =>
      row.report?.lastActivityAt
        ? formatDateTime(row.report.lastActivityAt)
        : "—",
  },
];

export function TeamTable({
  query,
  weekKey,
  meId,
  status,
  onStatus,
  sort,
  onSort,
  onPage,
  onLimit,
}) {
  return (
    <section aria-label="Team" className="flex flex-col gap-11">
      <div className="flex min-h-[30px] flex-wrap items-center justify-between gap-11">
        <h2 className="font-display text-panel-sm font-bold text-ink">Team</h2>
        <MultiSelect
          label="Status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={onStatus}
        />
      </div>
      <QueryView
        query={query}
        skeleton={
          <Table columns={COLUMNS} rows={[]} isLoading skeletonRows={6} />
        }
        error={
          <InlineError
            title="The team table didn’t load."
            onRetry={() => query.refetch()}
          >
            Check your connection and try again.
          </InlineError>
        }
      >
        {(data) => (
          <>
            <Table
              columns={COLUMNS}
              rows={data.items}
              rowKey={(row) => row.user._id}
              getRowHref={(row) => teamRowHref(row, meId, weekKey)}
              sort={sort}
              onSortChange={onSort}
              isFetching={query.isFetching}
              keepHeader
              emptyState={
                <EmptyState
                  title="No one matches this status."
                  action={
                    status.length > 0 ? (
                      <Button variant="secondary" onClick={() => onStatus([])}>
                        Clear filters
                      </Button>
                    ) : undefined
                  }
                />
              }
              caption={`Team, week ${weekKey}`}
            />
            <Pagination meta={data.meta} onPage={onPage} onLimit={onLimit} />
          </>
        )}
      </QueryView>
    </section>
  );
}
