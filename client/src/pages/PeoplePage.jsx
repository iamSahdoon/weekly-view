import { Link } from "react-router-dom";
import { PageContainer } from "../components/shell/PageContainer.jsx";
import { PageHeader } from "../components/shell/PageHeader.jsx";
import { Button } from "../components/ui/Button.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { FilterBar } from "../components/ui/FilterBar.jsx";
import { InlineError } from "../components/ui/InlineError.jsx";
import { MultiSelect } from "../components/ui/MultiSelect.jsx";
import { Pagination } from "../components/ui/Pagination.jsx";
import { QueryView } from "../components/ui/QueryView.jsx";
import { Select } from "../components/ui/Select.jsx";
import { PeopleTable } from "../components/user/PeopleTable.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useProjects } from "../hooks/useProjectQueries.js";
import { useUrlFilters } from "../hooks/useUrlFilters.js";
import { useUsers } from "../hooks/useUserQueries.js";
import { ROLE_LABELS, ROLES } from "../lib/constants.js";
import { currentWeekKey } from "../lib/dates.js";
import { isObjectId } from "../lib/routeParams.js";
import { peopleParams, showsHiddenStatuses } from "../lib/peopleParams.js";
import {
  enumParam,
  limitParam,
  listParam,
  pageParam,
  textParam,
} from "../lib/urlParams.js";

// People — /people, managers and admins (design §3.15, frontend_architecture.md §9.10):
// the directory behind the People nav item and the `‹ People` back-link of a profile.
// Search, role, project and status; status defaults to Active. While `q` is set the
// request leaves `status` out so a search reaches everyone — someone who has left is
// exactly who a directory is for — and a --tint note says so when a row the filter would
// have hidden comes back. The status control keeps its value, so clearing the search
// restores the filter. Row click opens the profile; `W41` opens that person's week.

const SPEC = {
  q: textParam(),
  role: listParam(ROLES),
  project: textParam(),
  status: enumParam(["active", "invited", "removed", "all"], "active"),
  sort: enumParam(
    ["name", "joinedAt", "lastActivityAt", "reportsFiled"],
    "name",
  ),
  dir: enumParam(["asc", "desc"], "asc"),
  page: pageParam(),
  limit: limitParam(),
};

const ROLE_OPTIONS = ROLES.map((value) => ({
  value,
  label: ROLE_LABELS[value],
}));
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "invited", label: "Invited" },
  { value: "removed", label: "Removed" },
  { value: "all", label: "All statuses" },
];
const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "reportsFiled", label: "Reports filed" },
  { value: "lastActivityAt", label: "Last activity" },
];

export default function PeoplePage() {
  const { user: me } = useAuth();
  const { filters, setFilter, setFilters, clear, activeCount, apiParams } =
    useUrlFilters(SPEC);
  const params = peopleParams(apiParams, filters);
  const people = useUsers(params);
  const projects = useProjects({ status: "active" });
  const weekKey = currentWeekKey();

  const projectOptions = [
    { value: "", label: "All projects" },
    ...(projects.data?.items ?? []).map((p) => ({
      value: p._id,
      label: p.name,
    })),
  ];
  const emptyFiltered = (
    <EmptyState
      title="No one matches these filters."
      action={
        <Button variant="secondary" onClick={clear}>
          Clear filters
        </Button>
      }
    />
  );
  const noTeam = (data) =>
    activeCount === 0 &&
    !filters.q &&
    data.items.every((user) => user._id === me._id);

  return (
    <>
      <PageHeader
        title="People"
        secondary={
          me.role === "admin" ? (
            <Button variant="secondary" asChild>
              <Link to="/users">Manage users</Link>
            </Button>
          ) : undefined
        }
      />
      <FilterBar
        search={filters.q}
        onSearch={(q) => setFilter("q", q, { replace: true })}
        searchPlaceholder="Search people"
        activeCount={activeCount}
        onClear={clear}
        sort={{
          options: SORT_OPTIONS,
          value: { id: filters.sort, dir: filters.dir },
          onChange: ({ id, dir }) => setFilters({ sort: id, dir }),
        }}
      >
        <MultiSelect
          label="Role"
          options={ROLE_OPTIONS}
          value={filters.role}
          onChange={(value) => setFilter("role", value)}
        />
        <Select
          size="sm"
          aria-label="Project"
          className="w-[180px]"
          value={isObjectId(filters.project) ? filters.project : ""}
          options={projectOptions}
          onChange={(event) => setFilter("project", event.target.value)}
        />
        <Select
          size="sm"
          aria-label="Status"
          className="w-[150px]"
          value={filters.status}
          options={STATUS_OPTIONS}
          onChange={(event) => setFilter("status", event.target.value)}
        />
      </FilterBar>
      <PageContainer size="wide">
        <QueryView
          query={people}
          skeleton={
            <PeopleTable rows={[]} isLoading meId={me._id} weekKey={weekKey} />
          }
          error={
            <InlineError
              title="The people didn’t load."
              onRetry={() => people.refetch()}
            >
              Check your connection and try again.
            </InlineError>
          }
          isEmpty={noTeam}
          empty={
            <div className="border border-hair bg-card">
              <EmptyState
                title="No one else on the team yet."
                action={
                  me.role === "admin" ? (
                    <Button variant="secondary" asChild>
                      <Link to="/users">Manage users</Link>
                    </Button>
                  ) : undefined
                }
              />
            </div>
          }
        >
          {(data) => (
            <div className="flex flex-col gap-11">
              {showsHiddenStatuses(filters, data.items) && (
                <p
                  role="status"
                  className="border border-hair bg-tint px-14 py-8 text-dense text-body"
                >
                  Showing matches in all statuses.
                </p>
              )}
              <PeopleTable
                rows={data.items}
                meId={me._id}
                weekKey={weekKey}
                sort={{ id: filters.sort, dir: filters.dir }}
                onSortChange={({ id, dir }) => setFilters({ sort: id, dir })}
                isFetching={people.isFetching}
                emptyState={emptyFiltered}
              />
              <Pagination
                meta={data.meta}
                onPage={(page) => setFilter("page", page)}
                onLimit={(limit) => setFilter("limit", limit)}
              />
            </div>
          )}
        </QueryView>
      </PageContainer>
    </>
  );
}
