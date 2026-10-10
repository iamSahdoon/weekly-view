import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { DailyUpdatesBlock } from "../components/report/DailyUpdatesBlock.jsx";
import { PrintFooter, PrintStatus } from "../components/report/PrintFooter.jsx";
import {
  DocumentSkeleton,
  RailBlock,
  VersionsList,
  WeekDocument,
} from "../components/report/WeekDocument.jsx";
import { WeekComments } from "../components/review/WeekComments.jsx";
import { PageContainer } from "../components/shell/PageContainer.jsx";
import { PageHeader } from "../components/shell/PageHeader.jsx";
import { Button } from "../components/ui/Button.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { InlineError } from "../components/ui/InlineError.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { StatusChip } from "../components/ui/StatusChip.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useSeenOnOpen } from "../hooks/useNewMarks.js";
import {
  useRevision,
  useRevisions,
  useWeek,
} from "../hooks/useReportQueries.js";
import { firstNameOf, formatWeekRange } from "../lib/format.js";
import {
  canEditReport,
  isAuthorOf,
  isManagerRole,
  weekThreadAccess,
} from "../lib/permissions.js";
import NotFoundPage from "./NotFoundPage.jsx";

// A week in full — /reports/:week and /people/:userId/reports/:week (design §3.4,
// frontend_architecture.md §9.4). One page, two addresses; the server decides which
// layers the viewer receives and this page renders what the response contains, not
// what the role alone suggests.

const weekNumber = (weekKey) => Number(weekKey.slice(6));

export default function ReportDetailPage() {
  const { week: weekKey, userId: routeUserId } = useParams();
  const { user: me } = useAuth();
  // /people/:me/reports/:week is only a longer spelling of /reports/:week.
  if (routeUserId && routeUserId === me._id) {
    return <Navigate to={`/reports/${weekKey}`} replace />;
  }
  return <WeekDetail weekKey={weekKey} userId={routeUserId ?? me._id} />;
}

function WeekDetail({ weekKey, userId }) {
  const { user: me } = useAuth();
  const own = userId === me._id;
  const query = useWeek(userId, weekKey);
  const week = query.data;
  const title = `Week ${weekNumber(weekKey)}`;

  if (query.isPending) {
    return (
      <>
        <PageHeader title={title} {...headerLinks(me, own, userId, null)} />
        <PageContainer>
          <DetailSkeleton />
        </PageContainer>
      </>
    );
  }

  // Only a week that never loaded is replaced by the error: a failed background
  // refetch (after a toggle's invalidation, say) keeps the loaded week on screen.
  if (query.isError && week === undefined) {
    const code = query.error.code;
    if (code === "USER_NOT_FOUND" || code === "REPORT_NOT_FOUND") {
      return <NotFoundPage />;
    }
    return (
      <>
        <PageHeader title={title} {...headerLinks(me, own, userId, null)} />
        <PageContainer>
          {code === "REPORT_FORBIDDEN" ? (
            <EmptyState
              variant="system"
              title="You don’t have access to this report."
            />
          ) : (
            <InlineError
              title="This week didn’t load."
              onRetry={() => query.refetch()}
            >
              Check your connection and try again.
            </InlineError>
          )}
        </PageContainer>
      </>
    );
  }

  if (!week.report) {
    return (
      <>
        <PageHeader
          title={title}
          {...headerLinks(me, own, userId, week.user)}
        />
        <PageContainer size="doc">
          <EmptyState
            title={`No report for week ${weekNumber(weekKey)}.`}
            action={
              <Button variant="secondary" asChild>
                <Link to={headerLinks(me, own, userId, week.user).back.to}>
                  Back
                </Link>
              </Button>
            }
          />
        </PageContainer>
      </>
    );
  }

  // Keyed by report, so a different week starts with no chosen version.
  return <ReportWeek key={week.report._id} week={week} own={own} />;
}

// Where Back goes, and how the header names the way here. The design's breadcrumb
// (People → Nadia F. → Week 31) leads through the two manager pages, so a member —
// who has neither — gets a back link to Team updates, where they came from.
function headerLinks(me, own, userId, person) {
  if (own) return { back: { label: "My reports", to: "/reports" } };
  if (isManagerRole(me.role) && person) {
    return {
      back: { label: person.name, to: `/people/${userId}` },
      breadcrumb: [
        { label: "People", to: "/people" },
        { label: person.name, to: `/people/${userId}` },
        { label: "Week" },
      ],
    };
  }
  if (isManagerRole(me.role)) {
    return { back: { label: "People", to: "/people" } };
  }
  return { back: { label: "Team updates", to: "/updates" } };
}

function ReportWeek({ week, own }) {
  const { user: me } = useAuth();
  const report = week.report;
  const number = weekNumber(week.weekKey);
  const [selected, setSelected] = useState(null);

  const readable = report.contentSource !== "withheld";
  const revisions = useRevisions(report._id, { enabled: readable });
  const revision = useRevision(report._id, selected);

  // Once per report, after the week has loaded — never `week` or `report`, so this
  // page keeps the "new" markers it opened with (§9.4, FA11).
  useSeenOnOpen(report._id);

  const author = isAuthorOf(me, report);
  const manager = isManagerRole(me.role);
  const firstName = firstNameOf(report.author?.name);
  const { canStart, canReply } = weekThreadAccess(me, report);
  const projects = [
    ...new Set(
      report.days.flatMap((d) => d.lines.map((l) => l.task?.project?.name)),
    ),
  ]
    .filter(Boolean)
    .sort();
  const links = headerLinks(me, own, week.user._id, week.user);
  const breadcrumb = links.breadcrumb?.map((item) =>
    item.to ? item : { ...item, label: `Week ${number}` },
  );

  return (
    <>
      <PageHeader
        title={`Week ${number}`}
        back={links.back}
        breadcrumb={breadcrumb}
        primary={
          canEditReport(me, report) ? (
            <Button asChild>
              <Link to={`/reports/${week.weekKey}/edit`}>Edit report</Link>
            </Button>
          ) : undefined
        }
      />
      <PageContainer>
        <div className="print-report grid gap-x-44 gap-y-32 lg:grid-cols-[minmax(0,860px)_280px] print:block">
          <div className="flex min-w-0 flex-col gap-44">
            <header className="flex flex-col gap-6">
              <p className="font-mono text-caption text-mut">
                W{number} · {formatWeekRange(week.weekKey)}
                {report.revisionNumber > 0 && ` · rev ${report.revisionNumber}`}
              </p>
              <h2 className="font-display text-page font-bold text-ink">
                Week {number} report
              </h2>
              <p className="text-base text-body">
                {report.author?.name}
                {projects.length > 0 && ` · ${projects.join(", ")}`}
              </p>
              <PrintStatus report={report} />
            </header>

            <DailyUpdatesBlock week={week} />

            <WeekDocument
              week={week}
              revision={selected != null ? revision : null}
              selected={selected}
              onBack={() => setSelected(null)}
              revisions={revisions.data?.items}
              firstName={firstName}
              author={author}
              manager={manager}
            />
            <PrintFooter
              weekNumber={number}
              author={report.author?.name}
              revisionNumber={report.revisionNumber}
            />
          </div>

          <aside
            aria-label="Status, versions and comments"
            className="flex min-w-0 flex-col gap-24 max-lg:order-first lg:sticky lg:top-[calc(94px+var(--demo-h,0px))] lg:max-h-[calc(100dvh-110px-var(--demo-h,0px))] lg:self-start lg:overflow-y-auto print:hidden"
          >
            <RailBlock label="Status">
              <div className="flex flex-wrap items-center gap-8">
                <StatusChip value={report.status} />
                {report.approvalRequested && (
                  <span className="text-dense text-body">Approval asked</span>
                )}
              </div>
            </RailBlock>

            {readable && (
              <RailBlock label="Versions">
                <VersionsList
                  revisions={revisions}
                  selected={selected}
                  onSelect={setSelected}
                />
              </RailBlock>
            )}

            {report.weekComments && (
              <RailBlock label="Overall comments">
                <WeekComments
                  reportId={report._id}
                  threads={report.weekComments}
                  canStart={canStart}
                  canReply={canReply}
                />
              </RailBlock>
            )}
          </aside>
        </div>
      </PageContainer>
    </>
  );
}

// ---------------------------------------------------------------- loading
// Layout-matched (design §3.4 "Loading"): the daily-updates rows, the document, the rail.

function DetailSkeleton() {
  return (
    <div className="grid gap-x-44 gap-y-32 lg:grid-cols-[minmax(0,860px)_280px]">
      <div className="flex min-w-0 flex-col gap-44">
        <div className="flex flex-col gap-8">
          <Skeleton className="h-[14px] w-[160px]" />
          <Skeleton className="h-[32px] w-[280px]" />
          <Skeleton className="h-[16px] w-[200px]" />
        </div>
        <div className="flex flex-col gap-14">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[64px] w-full" />
          ))}
        </div>
        <DocumentSkeleton />
      </div>
      <div className="flex flex-col gap-24 max-lg:order-first">
        <Skeleton className="h-[40px] w-full" />
        <Skeleton className="h-[96px] w-full" />
        <Skeleton className="h-[120px] w-full" />
      </div>
    </div>
  );
}
