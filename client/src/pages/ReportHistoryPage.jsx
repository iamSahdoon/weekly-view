import { Link } from "react-router-dom";
import { ReportHistoryTable } from "../components/report/ReportHistoryTable.jsx";
import { PageContainer } from "../components/shell/PageContainer.jsx";
import { PageHeader } from "../components/shell/PageHeader.jsx";
import { Button } from "../components/ui/Button.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { FilterBar } from "../components/ui/FilterBar.jsx";
import { MultiSelect } from "../components/ui/MultiSelect.jsx";
import { Pagination } from "../components/ui/Pagination.jsx";
import { QueryView } from "../components/ui/QueryView.jsx";
import { WeekRangeFilter } from "../components/ui/WeekRangeFilter.jsx";
import { useProjects } from "../hooks/useProjectQueries.js";
import { useMyReports } from "../hooks/useReportQueries.js";
import { useUrlFilters } from "../hooks/useUrlFilters.js";
import { REPORT_STATUSES } from "../lib/constants.js";
import {
  enumParam,
  limitParam,
  listParam,
  pageParam,
  weekParam,
} from "../lib/urlParams.js";
import { statusOf } from "../lib/statusMaps.js";

// My reports — /reports (design §3.3, frontend_architecture.md §9.5). A filter bar, the
// table, pagination. Everything the person chooses is in the URL: status, project, week
// range, sort, page. Reports only: a week with no report isn't a row here.
// The top bar names the page and has no action; the one primary action is the empty
// state's, for a person with no reports yet.

const SPEC = {
  status: listParam(REPORT_STATUSES),
  project: listParam(),
  weekFrom: weekParam(),
  weekTo: weekParam(),
  sort: enumParam(["weekKey", "lastActivityAt", "submittedAt"], "weekKey"),
  dir: enumParam(["asc", "desc"], "desc"),
  page: pageParam(),
  limit: limitParam(),
};

const STATUS_OPTIONS = REPORT_STATUSES.map((value) => ({
  value,
  label: statusOf("report", value).label,
}));

const SORT_OPTIONS = [
  { value: "weekKey", label: "Week" },
  { value: "lastActivityAt", label: "Last activity" },
];

export default function ReportHistoryPage() {
  const { filters, setFilter, setFilters, clear, activeCount, apiParams } =
    useUrlFilters(SPEC);
  const reports = useMyReports(apiParams);
  const projects = useProjects({ status: "all" });

  const projectOptions = (projects.data?.items ?? []).map((p) => ({
    value: p._id,
    label: p.name,
  }));
  const sort = { id: filters.sort, dir: filters.dir };
  // "No reports yet" is a list nothing filtered away; "nothing matches" is one that was.
  const isNew = activeCount === 0;

  const emptyFiltered = (
    <EmptyState
      variant="filtered"
      title="No reports match these filters."
      action={
        <Button variant="secondary" onClick={clear}>
          Clear filters
        </Button>
      }
    />
  );

  return (
    <>
      <PageHeader title="My reports" />
      <FilterBar
        activeCount={activeCount}
        onClear={clear}
        sort={{
          options: SORT_OPTIONS,
          value: sort,
          onChange: ({ id, dir }) => setFilters({ sort: id, dir }),
        }}
      >
        <MultiSelect
          label="Status"
          options={STATUS_OPTIONS}
          value={filters.status}
          onChange={(value) => setFilter("status", value)}
        />
        <MultiSelect
          label="Project"
          options={projectOptions}
          value={filters.project}
          onChange={(value) => setFilter("project", value)}
        />
        <WeekRangeFilter
          from={filters.weekFrom}
          to={filters.weekTo}
          onChange={setFilters}
        />
      </FilterBar>
      <PageContainer size="wide">
        <QueryView
          query={reports}
          skeleton={<ReportHistoryTable rows={[]} isLoading skeletonRows={8} />}
          isEmpty={(data) => data.meta.total === 0 && isNew}
          empty={
            <div className="border border-hair bg-card">
              <EmptyState
                title="No reports yet."
                action={
                  <Button asChild>
                    <Link to="/">Post today’s update</Link>
                  </Button>
                }
              >
                Each week you post updates for is listed here.
              </EmptyState>
            </div>
          }
        >
          {(data) => (
            <>
              <ReportHistoryTable
                rows={data.items}
                sort={sort}
                onSortChange={({ id, dir }) => setFilters({ sort: id, dir })}
                isFetching={reports.isFetching}
                emptyState={emptyFiltered}
                keepHeader
                caption="My reports"
              />
              <Pagination
                meta={data.meta}
                onPage={(page) => setFilter("page", page)}
                onLimit={(limit) => setFilter("limit", limit)}
              />
            </>
          )}
        </QueryView>
      </PageContainer>
    </>
  );
}
