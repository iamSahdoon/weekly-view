import { useLocation } from "react-router-dom";
import { ReviewDeskTable } from "../components/review/ReviewDeskTable.jsx";
import { PageContainer } from "../components/shell/PageContainer.jsx";
import { PageHeader } from "../components/shell/PageHeader.jsx";
import { Button } from "../components/ui/Button.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { FilterBar } from "../components/ui/FilterBar.jsx";
import { MultiSelect } from "../components/ui/MultiSelect.jsx";
import { Pagination } from "../components/ui/Pagination.jsx";
import { QueryView } from "../components/ui/QueryView.jsx";
import { SegmentedControl } from "../components/ui/SegmentedControl.jsx";
import { WeekRangeFilter } from "../components/ui/WeekRangeFilter.jsx";
import { useProjects } from "../hooks/useProjectQueries.js";
import { useReviewDesk } from "../hooks/useReviewQueries.js";
import { useUrlFilters } from "../hooks/useUrlFilters.js";
import { useUsers } from "../hooks/useUserQueries.js";
import { ROLES, ROLE_LABELS } from "../lib/constants.js";
import { REVIEW_DESK_SPEC } from "../lib/reviewDeskParams.js";

// Review desk — /review (design §3.5, frontend_architecture.md §9.6). The queue: reports
// that asked for approval, oldest first; `All submitted` adds the ones that didn't.
// Your own report is never listed — the server's V3 never returns it, so the page does
// nothing to filter. A row opens the review page and hands it this address, so "Next in
// review desk" can look for the next report under the same filters.

const APPROVAL = [
  { value: "requested", label: "Asked for approval" },
  { value: "all", label: "All submitted" },
];

const SORT_OPTIONS = [
  { value: "submittedAt", label: "Submitted" },
  { value: "weekKey", label: "Week" },
];

export default function ReviewDeskPage() {
  const location = useLocation();
  const { filters, setFilter, setFilters, clear, activeCount, apiParams } =
    useUrlFilters(REVIEW_DESK_SPEC);
  const desk = useReviewDesk(apiParams);
  // The person filter lists everyone U1 returns (G3: it can't yet narrow to a week).
  const people = useUsers({ limit: 100 });
  const projects = useProjects({ status: "all" });

  const personOptions = (people.data?.items ?? []).map((u) => ({
    value: u._id,
    label: u.name,
  }));
  const projectOptions = (projects.data?.items ?? []).map((p) => ({
    value: p._id,
    label: p.name,
  }));
  const roleOptions = ROLES.map((role) => ({
    value: role,
    label: ROLE_LABELS[role],
  }));
  const sort = { id: filters.sort, dir: filters.dir };

  return (
    <>
      <PageHeader title="Review desk" />
      <FilterBar
        activeCount={activeCount}
        onClear={clear}
        sort={{
          options: SORT_OPTIONS,
          value: sort,
          onChange: ({ id, dir }) => setFilters({ sort: id, dir }),
        }}
      >
        <SegmentedControl
          ariaLabel="Which reports"
          value={filters.approval}
          onChange={(value) => setFilter("approval", value)}
          options={APPROVAL}
        />
        <MultiSelect
          label="Person"
          options={personOptions}
          value={filters.person}
          onChange={(value) => setFilter("person", value)}
        />
        <MultiSelect
          label="Project"
          options={projectOptions}
          value={filters.project}
          onChange={(value) => setFilter("project", value)}
        />
        <MultiSelect
          label="Role"
          options={roleOptions}
          value={filters.role}
          onChange={(value) => setFilter("role", value)}
        />
        <WeekRangeFilter
          from={filters.weekFrom}
          to={filters.weekTo}
          onChange={setFilters}
        />
      </FilterBar>
      <PageContainer size="wide">
        <QueryView
          query={desk}
          skeleton={<ReviewDeskTable rows={[]} isLoading skeletonRows={6} />}
          isEmpty={(data) => data.meta.total === 0 && activeCount === 0}
          empty={
            <div className="border border-hair bg-card">
              <EmptyState title="Nothing waiting.">
                Reports that ask for approval land here.
              </EmptyState>
            </div>
          }
        >
          {(data) => (
            <>
              <ReviewDeskTable
                rows={data.items}
                sort={sort}
                onSortChange={({ id, dir }) => setFilters({ sort: id, dir })}
                linkState={{ deskSearch: location.search }}
                isFetching={desk.isFetching}
                emptyState={
                  <EmptyState
                    variant="filtered"
                    title="No reports match these filters."
                    action={
                      <Button variant="secondary" onClick={clear}>
                        Clear filters
                      </Button>
                    }
                  />
                }
                keepHeader
                caption="Reports waiting for review"
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
