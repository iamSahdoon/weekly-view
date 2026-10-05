import { useSearchParams } from "react-router-dom";
import { PageContainer } from "../components/shell/PageContainer.jsx";
import { PageHeader } from "../components/shell/PageHeader.jsx";
import { DayTabs } from "../components/updates/DayTabs.jsx";
import { PersonUpdate } from "../components/updates/PersonUpdate.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Checkbox } from "../components/ui/Checkbox.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { FilterBar } from "../components/ui/FilterBar.jsx";
import { InlineError } from "../components/ui/InlineError.jsx";
import { QueryView } from "../components/ui/QueryView.jsx";
import { Select } from "../components/ui/Select.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { WeekPicker } from "../components/ui/WeekPicker.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useHolidaysForWeek } from "../hooks/useHolidayQueries.js";
import { useProjects } from "../hooks/useProjectQueries.js";
import { useTeamUpdates } from "../hooks/useReportQueries.js";
import { useUrlFilters } from "../hooks/useUrlFilters.js";
import { useWeekParam } from "../hooks/useWeekParam.js";
import { weekKeyOf } from "../lib/dates.js";
import { isObjectId } from "../lib/routeParams.js";
import { resolveUpdatesDay, updatesDays } from "../lib/updatesDay.js";
import { enumParam, textParam } from "../lib/urlParams.js";

// Team updates — /updates (design §3.16, frontend_architecture.md §9.2). The team's
// daily updates, day by day: one panel per person for the chosen day, sorted by name
// with the viewer first (the server's order — the page doesn't re-sort). Every role
// sees every teammate here. URL: `week`, `day`, `project`, `blockers`.

const SPEC = {
  project: textParam(),
  blockers: enumParam(["1"], null),
};

export default function TeamUpdatesPage() {
  const { user: me } = useAuth();
  const { weekKey, setWeek } = useWeekParam();
  const [searchParams, setSearchParams] = useSearchParams();
  const { filters, setFilter, clear, activeCount } = useUrlFilters(SPEC);
  const holidays = useHolidaysForWeek(weekKey);
  const projects = useProjects({ status: "active" });

  const holidayDays = holidays.data ?? {};
  const days = updatesDays(weekKey, holidayDays);
  const weekday = resolveUpdatesDay(
    searchParams.get("day"),
    weekKey,
    holidayDays,
  );

  const project = isObjectId(filters.project) ? filters.project : "";
  const blockersOnly = filters.blockers === "1";
  const feed = useTeamUpdates(weekKey, weekday, { project, blockersOnly });

  const chooseDay = (next) => {
    const params = new URLSearchParams(searchParams);
    params.set("day", next);
    setSearchParams(params);
  };

  const projectOptions = [
    { value: "", label: "All projects" },
    ...(projects.data?.items ?? []).map((p) => ({
      value: p._id,
      label: p.name,
    })),
  ];

  return (
    <>
      <PageHeader
        title="Team updates"
        weekPicker={
          <WeekPicker
            value={weekKey}
            onChange={setWeek}
            min={me.joinedAt ? weekKeyOf(new Date(me.joinedAt)) : undefined}
          />
        }
      />
      <FilterBar activeCount={activeCount} onClear={clear} width="page">
        <Select
          size="sm"
          aria-label="Project"
          className="w-[180px]"
          value={project}
          options={projectOptions}
          onChange={(event) => setFilter("project", event.target.value)}
        />
        <Checkbox
          label="Only blockers"
          checked={blockersOnly}
          onChange={(event) =>
            setFilter("blockers", event.target.checked ? "1" : null)
          }
        />
      </FilterBar>
      <PageContainer>
        <div className="flex flex-col gap-24">
          <DayTabs days={days} value={weekday} onChange={chooseDay} />
          {weekday == null ? (
            <EmptyState title="No days to show yet.">
              Every day of this week is a holiday or still ahead.
            </EmptyState>
          ) : (
            <QueryView
              query={feed}
              skeleton={<FeedSkeleton />}
              error={
                <InlineError
                  title="Team updates didn’t load."
                  onRetry={() => feed.refetch()}
                >
                  Check your connection and try again.
                </InlineError>
              }
              isEmpty={(data) => data.items.length === 0}
              empty={
                <div className="border border-hair bg-card">
                  <EmptyState
                    title={
                      activeCount > 0
                        ? "No updates match these filters."
                        : "Nobody was on the team that day."
                    }
                    action={
                      activeCount > 0 ? (
                        <Button variant="secondary" onClick={clear}>
                          Clear filters
                        </Button>
                      ) : undefined
                    }
                  />
                </div>
              }
            >
              {(data) => (
                <ul
                  aria-label="Updates for the chosen day"
                  className="flex flex-col gap-11"
                >
                  {data.items.map((entry) => (
                    <PersonUpdate
                      key={entry.user._id}
                      entry={entry}
                      weekKey={weekKey}
                    />
                  ))}
                </ul>
              )}
            </QueryView>
          )}
        </div>
      </PageContainer>
    </>
  );
}

// Five panels at real heights (design §3.16 "Loading").
function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-11" aria-hidden="true">
      {[148, 96, 148, 52, 52].map((height, i) => (
        <Skeleton key={i} className="w-full" style={{ height }} />
      ))}
    </div>
  );
}
