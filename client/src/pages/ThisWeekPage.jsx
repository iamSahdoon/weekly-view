import { format } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CorrectionPanel } from "../components/report/CorrectionPanel.jsx";
import { CurrentWeekPanel } from "../components/report/CurrentWeekPanel.jsx";
import { DayPanel } from "../components/report/DayPanel.jsx";
import { MyProjectsPanel } from "../components/report/MyProjectsPanel.jsx";
import { OnLeaveStrip } from "../components/report/OnLeaveStrip.jsx";
import { PersonalStrip } from "../components/report/PersonalStrip.jsx";
import { RecentWeeksList } from "../components/report/RecentWeeksList.jsx";
import { WeekStrip } from "../components/report/WeekStrip.jsx";
import { EndLeaveDialog } from "../components/user/EndLeaveDialog.jsx";
import { PageContainer } from "../components/shell/PageContainer.jsx";
import { PageHeader } from "../components/shell/PageHeader.jsx";
import { Button } from "../components/ui/Button.jsx";
import { InlineError } from "../components/ui/InlineError.jsx";
import { QueryView } from "../components/ui/QueryView.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { WeekPicker } from "../components/ui/WeekPicker.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useHolidaysForWeek } from "../hooks/useHolidayQueries.js";
import { useProjects } from "../hooks/useProjectQueries.js";
import {
  useMarkSeen,
  useMyReports,
  useReportSummary,
  useWeek,
} from "../hooks/useReportQueries.js";
import { useOnLeave, useSetLeave } from "../hooks/useUserQueries.js";
import { useWeekParam, useWeekdayParam } from "../hooks/useWeekParam.js";
import { WEEKDAYS } from "../lib/constants.js";
import { weekKeyOf, weekdayOf } from "../lib/dates.js";
import { errorCopy } from "../lib/errorCopy.js";
import { deriveWeekAction } from "../lib/weekActions.js";

// This week — "/" signed in (design §3.1, frontend_architecture.md §9.1). The strip
// chooses a day, the day panel writes it, and the panels below summarise the week and
// the person's projects. The top-bar primary action follows the week's state
// (lib/weekActions). URL: `week`, `day`, `unit`.

const RECENT = { limit: 20, sort: "weekKey", dir: "desc" };
const PANEL_ID = "day-panel";

export default function ThisWeekPage() {
  const { user: me } = useAuth();
  const { weekKey, isCurrent, setWeek } = useWeekParam();
  const [searchParams, setSearchParams] = useSearchParams();
  const week = useWeek(me._id, weekKey);
  const recent = useMyReports(RECENT);
  const holidays = useHolidaysForWeek(weekKey);
  const onLeave = useOnLeave({ enabled: isCurrent });
  const setLeave = useSetLeave();
  // Turning leave off asks first (owner decision, C4).
  const [confirmEnd, setConfirmEnd] = useState(false);
  const projects = useProjects({ mine: true });
  const summary = useReportSummary(weekKey, format(new Date(), "yyyy-MM"));

  const view = week.data;
  const missingDays = view
    ? WEEKDAYS.filter((d) => view.dayStates[d] === "missing")
    : undefined;
  const { weekday, setWeekday } = useWeekdayParam(weekKey, { missingDays });

  const unit = searchParams.get("unit") === "hours" ? "hours" : "days";
  const setUnit = (next) => {
    const params = new URLSearchParams(searchParams);
    if (next === "days") params.delete("unit");
    else params.set("unit", next);
    setSearchParams(params, { replace: true });
  };

  // R13 once per report, as on the week page (§9.4).
  const { mutate: markSeen } = useMarkSeen();
  const seenFor = useRef(null);
  const reportId = view?.report?._id;
  useEffect(() => {
    if (!reportId || seenFor.current === reportId) return;
    seenFor.current = reportId;
    markSeen(reportId);
  }, [reportId, markSeen]);

  const panelRef = useRef(null);
  const chooseDay = (next) => {
    setWeekday(next);
    panelRef.current?.scrollIntoView?.({ block: "nearest" });
  };

  const action = deriveWeekAction(view, me);
  const primary = action ? (
    action.to ? (
      <Button asChild>
        <Link to={action.to}>{action.label}</Link>
      </Button>
    ) : (
      <Button onClick={() => chooseDay(action.weekday)}>{action.label}</Button>
    )
  ) : null;

  const reportedWeeks = Object.fromEntries(
    (recent.data?.items ?? []).map((r) => [r.weekKey, r.status]),
  );
  const header = (
    <PageHeader
      title="This week"
      weekPicker={
        <WeekPicker
          value={weekKey}
          onChange={setWeek}
          min={me.joinedAt ? weekKeyOf(new Date(me.joinedAt)) : undefined}
          reportedWeeks={reportedWeeks}
        />
      }
      primary={primary}
    />
  );

  if (week.isPending) {
    return (
      <>
        {header}
        <PageContainer>
          <PageSkeleton />
        </PageContainer>
      </>
    );
  }

  if (week.isError && view === undefined) {
    return (
      <>
        {header}
        <PageContainer>
          <InlineError
            title="This week didn’t load."
            onRetry={() => week.refetch()}
          >
            Check your connection and try again.
          </InlineError>
        </PageContainer>
      </>
    );
  }

  // Nothing ever: one panel in place of the day panel and the rest (design §3.1).
  const firstWeek =
    view.report === null &&
    recent.data?.meta?.total === 0 &&
    !searchParams.has("day");
  const today = weekdayOf(new Date());
  const otherNames = (onLeave.data?.items ?? [])
    .filter((u) => u._id !== me._id)
    .map((u) => u.name);
  const myProjects = projects.data?.items ?? [];

  return (
    <>
      {header}
      <PageContainer>
        <div className="flex flex-col gap-32">
          <div className="flex flex-col gap-8">
            <WeekStrip
              dayStates={view.dayStates}
              days={view.report?.days ?? []}
              holidays={holidays.data ?? {}}
              selected={firstWeek ? null : weekday}
              onSelect={chooseDay}
              panelId={PANEL_ID}
            />
            <OnLeaveStrip
              names={otherNames}
              holidays={holidays.data ?? {}}
              isCurrentWeek={isCurrent}
              meOnLeave={me.onLeave}
              ending={setLeave.isPending}
              error={setLeave.error ? errorCopy(setLeave.error) : null}
              onEndLeave={() => setConfirmEnd(true)}
            />
            <EndLeaveDialog
              person={me}
              isSelf
              open={confirmEnd}
              onOpenChange={setConfirmEnd}
              pending={setLeave.isPending}
              onConfirm={() =>
                setLeave.mutate(
                  { userId: me._id, onLeave: false },
                  { onSettled: () => setConfirmEnd(false) },
                )
              }
            />
          </div>

          {firstWeek ? (
            <FirstWeekPanel
              canPostToday={Boolean(today) && view.dayStates[today] === "today"}
              onStart={() => chooseDay(today)}
            />
          ) : (
            <>
              <div id={PANEL_ID} ref={panelRef} role="tabpanel">
                <DayPanel
                  key={`${weekKey}:${weekday}`}
                  week={view}
                  weekday={weekday}
                  isOwn
                />
              </div>

              {view.report?.status === "needs_correction" && (
                <CorrectionPanel week={view} />
              )}

              <div className="grid gap-24 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <CurrentWeekPanel week={view} />
                </div>
                {myProjects.length > 0 && (
                  <div className="lg:col-span-4">
                    <MyProjectsPanel
                      projects={myProjects}
                      unit={unit}
                      onUnitChange={setUnit}
                    />
                  </div>
                )}
              </div>

              <div className="grid gap-24 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <QueryView
                    query={recent}
                    skeleton={<Skeleton className="h-[290px] w-full" />}
                    error={
                      <InlineError
                        title="Recent weeks didn’t load."
                        onRetry={() => recent.refetch()}
                      />
                    }
                  >
                    {(data) => (
                      <RecentWeeksList rows={data.items.slice(0, 5)} />
                    )}
                  </QueryView>
                </div>
                <div className="lg:col-span-4">
                  <QueryView
                    query={summary}
                    skeleton={<Skeleton className="h-[96px] w-full" />}
                    error={
                      <InlineError
                        title="Your numbers didn’t load."
                        onRetry={() => summary.refetch()}
                      />
                    }
                  >
                    {(data) => <PersonalStrip summary={data} />}
                  </QueryView>
                </div>
              </div>
            </>
          )}
        </div>
      </PageContainer>
    </>
  );
}

function FirstWeekPanel({ canPostToday, onStart }) {
  return (
    <section className="flex flex-col items-start gap-11 border border-hair bg-card p-24">
      <h2 className="font-display text-panel font-bold text-ink">
        Your first week starts here.
      </h2>
      <p className="text-base text-body">
        Post what you did today. Your weekly report builds itself from your
        daily updates.
      </p>
      {canPostToday && (
        <Button variant="secondary" onClick={onStart}>
          Post today’s update
        </Button>
      )}
    </section>
  );
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-32">
      <Skeleton className="h-[52px] w-full" />
      <Skeleton className="h-[320px] w-full" />
      <div className="grid gap-24 lg:grid-cols-12">
        <Skeleton className="h-[260px] w-full lg:col-span-8" />
        <Skeleton className="h-[260px] w-full lg:col-span-4" />
      </div>
    </div>
  );
}
