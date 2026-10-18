import { Link, useParams } from "react-router-dom";
import { UpdatesCell } from "../components/dashboard/UpdatesCell.jsx";
import { MetricCell } from "../components/dashboard/MetricCell.jsx";
import { PageContainer } from "../components/shell/PageContainer.jsx";
import { PageHeader } from "../components/shell/PageHeader.jsx";
import { Avatar } from "../components/ui/Avatar.jsx";
import { Button } from "../components/ui/Button.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { InlineError } from "../components/ui/InlineError.jsx";
import { MultiSelect } from "../components/ui/MultiSelect.jsx";
import { Pagination } from "../components/ui/Pagination.jsx";
import { QueryView } from "../components/ui/QueryView.jsx";
import { RoleChip } from "../components/ui/RoleChip.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { StatusChip } from "../components/ui/StatusChip.jsx";
import { WeekRangeFilter } from "../components/ui/WeekRangeFilter.jsx";
import { LeaveHistory } from "../components/user/LeaveHistory.jsx";
import { LeaveToggleHost } from "../components/user/LeaveToggleHost.jsx";
import { PersonReportsTable } from "../components/user/PersonReportsTable.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { usePersonMetrics } from "../hooks/useDashboardQueries.js";
import { useUserReports, useWeek } from "../hooks/useReportQueries.js";
import { useUrlFilters } from "../hooks/useUrlFilters.js";
import { useUser } from "../hooks/useUserQueries.js";
import { REPORT_STATUSES, WEEK_STATES } from "../lib/constants.js";
import { personWeekHref } from "../lib/dashboardParams.js";
import { currentWeekKey, weekNumberLabel } from "../lib/dates.js";
import {
  formatDate,
  formatDateLong,
  formatHours,
  formatPercent,
  formatWeekRange,
} from "../lib/format.js";
import { statusOf } from "../lib/statusMaps.js";
import { offTeamAllWeek } from "../lib/weekActions.js";
import {
  enumParam,
  limitParam,
  listParam,
  pageParam,
  weekParam,
} from "../lib/urlParams.js";
import NotFoundPage from "./NotFoundPage.jsx";

// A person, seen by a manager or admin — /people/:userId (design §3.8,
// frontend_architecture.md §9.9). The header (who, role, projects, joined, and the On leave
// chip with "since …"), this week's posting at a glance, a four-cell metric strip, the
// leave history, and every week on the team as a table. The numbers here are evaluative
// because this is one person seen by a manager; the words stay factual (`Corrections`, not
// `Rejections`). Top bar: `‹ People`, the leave toggle (turning it off asks first), and,
// for an admin, `Manage` → that person's row on Users.

const STATUS_VALUES = [...WEEK_STATES, ...REPORT_STATUSES];
const STATUS_OPTIONS = STATUS_VALUES.map((value) => ({
  value,
  label: statusOf("week", value).label,
}));
const SPEC = {
  status: listParam(STATUS_VALUES),
  weekFrom: weekParam(),
  weekTo: weekParam(),
  sort: enumParam(["weekKey", "lastActivityAt"], "weekKey"),
  dir: enumParam(["asc", "desc"], "desc"),
  page: pageParam(),
  limit: limitParam(),
};

export default function PersonProfilePage() {
  const { userId } = useParams();
  const { user: me } = useAuth();
  const person = useUser(userId);

  if (person.isError && person.data === undefined) {
    if (person.error.code === "USER_NOT_FOUND") return <NotFoundPage />;
    return (
      <>
        <PageHeader title="Person" back={{ label: "People", to: "/people" }} />
        <PageContainer>
          <InlineError
            title="This person didn’t load."
            onRetry={() => person.refetch()}
          >
            Check your connection and try again.
          </InlineError>
          <div className="mt-20">
            <Button variant="secondary" asChild>
              <Link to="/people">Back to people</Link>
            </Button>
          </div>
        </PageContainer>
      </>
    );
  }
  if (person.isPending) {
    return (
      <>
        <PageHeader title="Person" back={{ label: "People", to: "/people" }} />
        <PageContainer size="page">
          <HeaderSkeleton />
        </PageContainer>
      </>
    );
  }
  return <Profile person={person.data} me={me} />;
}

function HeaderSkeleton() {
  return (
    <div className="flex flex-col gap-24" aria-hidden="true">
      <div className="flex items-center gap-14">
        <Skeleton className="size-[44px]" />
        <div className="flex flex-col gap-8">
          <Skeleton className="h-[20px] w-[180px]" />
          <Skeleton className="h-[14px] w-[260px]" />
        </div>
      </div>
      <Skeleton className="h-[92px] w-full" />
      <Skeleton className="h-[240px] w-full" />
    </div>
  );
}

function Profile({ person, me }) {
  const { filters, setFilter, setFilters, clear, activeCount, apiParams } =
    useUrlFilters(SPEC);
  const reports = useUserReports(person._id, apiParams);
  const sort = { id: filters.sort, dir: filters.dir };
  const projects = person.projects.map((p) => p.name).join(", ");
  const active = person.status === "active";

  return (
    <LeaveToggleHost>
      {({ request, pending }) => (
        <>
          <PageHeader
            title={person.name || person.email}
            back={{ label: "People", to: "/people" }}
            secondary={
              <>
                {active && (
                  <Button
                    variant="secondary"
                    data-tour="profile-leave"
                    loading={pending}
                    onClick={() => request(person)}
                  >
                    {person.onLeave ? "End leave" : "Mark as on leave"}
                  </Button>
                )}
                {me.role === "admin" && (
                  <Button variant="secondary" asChild>
                    <Link to={`/users?q=${encodeURIComponent(person.email)}`}>
                      Manage
                    </Link>
                  </Button>
                )}
              </>
            }
          />
          <PageContainer size="page">
            <div className="flex flex-col gap-24">
              <PersonHeader person={person} projects={projects} />
              {active && <ThisWeek person={person} meId={me._id} />}
              <MetricsStrip userId={person._id} />
              <LeaveHistory
                personId={person._id}
                history={person.leaveHistory ?? []}
              />
              <section
                aria-label="Report history"
                className="flex flex-col gap-11"
              >
                <div className="flex min-h-[30px] flex-wrap items-center justify-between gap-11">
                  <h2 className="font-display text-panel-sm font-bold text-ink">
                    Every week
                  </h2>
                  <div className="flex flex-wrap items-center gap-11">
                    <MultiSelect
                      label="Status"
                      options={STATUS_OPTIONS}
                      value={filters.status}
                      onChange={(value) => setFilter("status", value)}
                    />
                    <WeekRangeFilter
                      from={filters.weekFrom}
                      to={filters.weekTo}
                      onChange={setFilters}
                    />
                    {activeCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={clear}>
                        Clear ({activeCount})
                      </Button>
                    )}
                  </div>
                </div>
                <QueryView
                  query={reports}
                  skeleton={
                    <PersonReportsTable
                      rows={[]}
                      isLoading
                      skeletonRows={6}
                      userId={person._id}
                      meId={me._id}
                    />
                  }
                  error={
                    <InlineError
                      title="The weeks didn’t load."
                      onRetry={() => reports.refetch()}
                    >
                      Check your connection and try again.
                    </InlineError>
                  }
                  isEmpty={(data) => data.meta.total === 0 && activeCount === 0}
                  empty={
                    <div className="border border-hair bg-card">
                      <EmptyState title="This person hasn’t filed a report yet." />
                    </div>
                  }
                >
                  {(data) => (
                    <>
                      <PersonReportsTable
                        rows={data.items}
                        userId={person._id}
                        meId={me._id}
                        sort={sort}
                        onSortChange={({ id, dir }) =>
                          setFilters({ sort: id, dir })
                        }
                        isFetching={reports.isFetching}
                        keepHeader
                        emptyState={
                          <EmptyState
                            variant="filtered"
                            title="No weeks match these filters."
                            action={
                              <Button variant="secondary" onClick={clear}>
                                Clear filters
                              </Button>
                            }
                          />
                        }
                        caption={`${person.name}’s weeks`}
                      />
                      <Pagination
                        meta={data.meta}
                        onPage={(page) => setFilter("page", page)}
                        onLimit={(limit) => setFilter("limit", limit)}
                      />
                    </>
                  )}
                </QueryView>
              </section>
            </div>
          </PageContainer>
        </>
      )}
    </LeaveToggleHost>
  );
}

function PersonHeader({ person, projects }) {
  return (
    <header className="flex flex-wrap items-start gap-16 border border-hair bg-card px-24 py-20">
      <Avatar name={person.name || person.email} size={44} />
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-11 gap-y-4">
          <h2 className="font-display text-panel font-bold text-ink">
            {person.name || person.email}
          </h2>
          <RoleChip role={person.role} />
          {person.onLeave && person.status === "active" && (
            <span className="inline-flex items-center gap-8">
              <StatusChip kind="week" value="on_leave" />
              {person.leaveSince && (
                <span className="font-mono text-caption text-mut">
                  since {formatDate(person.leaveSince)}
                </span>
              )}
            </span>
          )}
          {person.status !== "active" && (
            <StatusChip kind="user" value={person.status} />
          )}
        </div>
        <p className="text-dense text-body">
          {person.email}
          {projects && ` · ${projects}`}
        </p>
        {person.joinedAt && (
          <p className="font-mono text-caption text-mut">
            Joined {formatDateLong(person.joinedAt)}
          </p>
        )}
      </div>
    </header>
  );
}

// This week at a glance: the five update squares and the week's state, with the way in to
// the week itself — the same address Team updates uses. A failed read leaves it out; the
// rest of the page does not depend on it.
function ThisWeek({ person, meId }) {
  const weekKey = currentWeekKey();
  const week = useWeek(person._id, weekKey);
  if (!week.data) return null;
  return (
    <section
      aria-label="This week"
      data-tour="profile-this-week"
      className="flex flex-wrap items-center justify-between gap-x-20 gap-y-8 border border-hair bg-card px-24 py-14"
    >
      <div className="flex flex-wrap items-center gap-x-14 gap-y-6">
        <h2 className="font-display text-panel-sm font-bold text-ink">
          This week
        </h2>
        <span className="font-mono text-caption text-mut">
          {weekNumberLabel(weekKey)} · {formatWeekRange(weekKey)}
        </span>
        <UpdatesCell dayStates={week.data.dayStates} />
        {!offTeamAllWeek(week.data.dayStates) && (
          <StatusChip kind="week" value={week.data.state} />
        )}
      </div>
      <Button variant="secondary" size="sm" asChild>
        <Link to={personWeekHref(person._id, meId, weekKey)}>
          Open {weekNumberLabel(weekKey)}
        </Link>
      </Button>
    </section>
  );
}

const GRID =
  "grid grid-cols-4 gap-px border border-hair bg-hair max-[899px]:grid-cols-2 max-[639px]:grid-cols-1";

function MetricsStrip({ userId }) {
  const metrics = usePersonMetrics(userId);
  return (
    <QueryView
      query={metrics}
      skeleton={<Skeleton className="h-[92px] w-full" />}
      error={
        <InlineError
          title="The figures didn’t load."
          onRetry={() => metrics.refetch()}
        >
          Check your connection and try again.
        </InlineError>
      }
    >
      {(data) => (
        <div className={GRID}>
          <MetricCell
            label="Reports filed"
            tone="acc"
            value={String(data.reportsFiled)}
          />
          <MetricCell
            label="Compliance"
            tone="ok"
            value={formatPercent(data.compliance)}
          />
          <MetricCell
            label="Avg hours / week"
            value={
              data.avgHoursPerWeek == null
                ? "—"
                : formatHours(Math.round(data.avgHoursPerWeek * 10) / 10)
            }
          />
          <MetricCell
            label="Corrections"
            tone="corr"
            value={String(data.corrections)}
          />
        </div>
      )}
    </QueryView>
  );
}
