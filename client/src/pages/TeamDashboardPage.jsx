import { useState } from "react";
import { Link } from "react-router-dom";
import { ActivityFeed } from "../components/dashboard/ActivityFeed.jsx";
import { HoursByTypeChart } from "../components/dashboard/HoursByTypeChart.jsx";
import { MetricStrip } from "../components/dashboard/MetricStrip.jsx";
import { ProjectsTable } from "../components/dashboard/ProjectsTable.jsx";
import { TasksTrendChart } from "../components/dashboard/TasksTrendChart.jsx";
import { TeamTable } from "../components/dashboard/TeamTable.jsx";
import { PlanModal } from "../components/project/PlanModal.jsx";
import { WorkloadByProjectChart } from "../components/dashboard/WorkloadByProjectChart.jsx";
import { PageContainer } from "../components/shell/PageContainer.jsx";
import { PageHeader } from "../components/shell/PageHeader.jsx";
import { Button } from "../components/ui/Button.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { FilterBar } from "../components/ui/FilterBar.jsx";
import { MultiSelect } from "../components/ui/MultiSelect.jsx";
import { Select } from "../components/ui/Select.jsx";
import { WeekPicker } from "../components/ui/WeekPicker.jsx";
import { useAuth } from "../hooks/useAuth.js";
import {
  useDashboardHours,
  useDashboardProjects,
  useDashboardSummary,
  useDashboardTeam,
  useDashboardTrend,
  useDashboardWorkload,
  useRecentActivity,
} from "../hooks/useDashboardQueries.js";
import { useProjects } from "../hooks/useProjectQueries.js";
import { useUrlFilters } from "../hooks/useUrlFilters.js";
import { useUsers } from "../hooks/useUserQueries.js";
import { useWeekParam } from "../hooks/useWeekParam.js";
import { weekKeyOf } from "../lib/dates.js";
import {
  DASHBOARD_SPEC,
  dashboardParams,
  pageFilterCount,
} from "../lib/dashboardParams.js";
import { isObjectId } from "../lib/routeParams.js";

// Team dashboard — /team (design §3.7, frontend_architecture.md §9.8). Managers and admins
// read one week at a time, the week in the top bar. Seven blocks, each its own query and
// its own four states, so one failing leaves the rest: the metric strip, the team table,
// the projects table, the tasks trend, hours by task type, workload by project and recent
// activity. The page-level filters are person and project. `status` is the team table's
// alone — it is not in the params of any other block — and the trend's window and person
// and the projects table's unit are theirs too. Nothing on this page is written.

export default function TeamDashboardPage() {
  const { user: me } = useAuth();
  const { weekKey, setWeek } = useWeekParam();
  // The project whose plan is being extended (the projects table's `Extend plan`).
  const [extending, setExtending] = useState(null);
  const { filters, setFilter, setFilters } = useUrlFilters(DASHBOARD_SPEC);
  const params = dashboardParams(filters, weekKey);

  const summary = useDashboardSummary(params.summary);
  const team = useDashboardTeam(params.team);
  const projectsTable = useDashboardProjects(params.projects);
  const trend = useDashboardTrend(params.trend);
  const hours = useDashboardHours(params.hours);
  const workload = useDashboardWorkload(params.workload);
  const activity = useRecentActivity();

  // The person filters list everyone U1 returns (G3: it can't yet narrow to a week).
  const people = useUsers({ limit: 100 });
  const projects = useProjects({ usedInWeek: weekKey });
  const personOptions = (people.data?.items ?? []).map((u) => ({
    value: u._id,
    label: u.name,
  }));
  const projectOptions = [
    { value: "", label: "All projects" },
    ...(projects.data?.items ?? []).map((p) => ({
      value: p._id,
      label: p.name,
    })),
  ];

  const filterCount = pageFilterCount(filters);
  const clearFilters = () => setFilters({ person: [], project: "" });
  // The trend's and the projects table's controls are theirs: changing one keeps the
  // team table on the page it is on.
  const keepPage = (patch) => setFilters({ ...patch, page: filters.page });

  const noTeam =
    team.data?.meta.total === 0 &&
    filterCount === 0 &&
    filters.status.length === 0;

  return (
    <>
      <PageHeader
        title="Team dashboard"
        weekPicker={
          <WeekPicker
            value={weekKey}
            onChange={setWeek}
            min={me.joinedAt ? weekKeyOf(new Date(me.joinedAt)) : undefined}
          />
        }
      />
      <FilterBar
        activeCount={filterCount}
        onClear={clearFilters}
        className="sticky top-[calc(var(--demo-h,0px)+62px)] z-20"
      >
        <MultiSelect
          label="Person"
          options={personOptions}
          value={filters.person}
          onChange={(value) => setFilter("person", value)}
        />
        <Select
          size="sm"
          aria-label="Project"
          className="w-[180px]"
          value={isObjectId(filters.project) ? filters.project : ""}
          options={projectOptions}
          onChange={(event) => setFilter("project", event.target.value)}
        />
      </FilterBar>
      <PageContainer size="wide">
        {noTeam ? (
          <div className="border border-hair bg-card">
            <EmptyState
              title="No one is on the team yet."
              action={
                me.role === "admin" ? (
                  <Button asChild>
                    <Link to="/users">Invite people</Link>
                  </Button>
                ) : undefined
              }
            >
              Invite people and their weeks will show up here.
            </EmptyState>
          </div>
        ) : (
          <div className="flex flex-col gap-24">
            <MetricStrip query={summary} />
            <TeamTable
              query={team}
              weekKey={weekKey}
              meId={me._id}
              status={filters.status}
              onStatus={(value) => setFilter("status", value)}
              sort={{ id: filters.sort, dir: filters.dir }}
              onSort={({ id, dir }) => setFilters({ sort: id, dir })}
              onPage={(page) => setFilter("page", page)}
              onLimit={(limit) => setFilter("limit", limit)}
            />
            <ProjectsTable
              query={projectsTable}
              unit={filters.unit}
              onUnitChange={(unit) => keepPage({ unit })}
              onExtend={setExtending}
            />
            <div
              data-tour="dashboard-charts"
              className="grid grid-cols-1 gap-24 min-[1200px]:grid-cols-12"
            >
              <TasksTrendChart
                query={trend}
                weeks={Number(filters.trendWeeks)}
                onWeeks={(n) => keepPage({ trendWeeks: String(n) })}
                personId={
                  isObjectId(filters.trendPerson) ? filters.trendPerson : ""
                }
                onPerson={(id) => keepPage({ trendPerson: id })}
                people={personOptions}
              />
              <HoursByTypeChart query={hours} weekKey={weekKey} />
              <WorkloadByProjectChart query={workload} weekKey={weekKey} />
              <ActivityFeed
                query={activity}
                meId={me._id}
                className="min-[1200px]:col-span-6"
              />
            </div>
          </div>
        )}
      </PageContainer>
      {extending && (
        <PlanModal
          project={extending}
          open
          onOpenChange={(next) => !next && setExtending(null)}
        />
      )}
    </>
  );
}
