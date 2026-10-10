import { useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { DailyUpdatesBlock } from "../components/report/DailyUpdatesBlock.jsx";
import { PrintFooter, PrintStatus } from "../components/report/PrintFooter.jsx";
import {
  DocumentSkeleton,
  RailBlock,
  VersionsList,
  WeekDocument,
} from "../components/report/WeekDocument.jsx";
import { ReadOnlyStrip } from "../components/review/ReadOnlyStrip.jsx";
import { ReviewActionPanel } from "../components/review/ReviewActionPanel.jsx";
import { ReviewPersonBlock } from "../components/review/ReviewPersonBlock.jsx";
import { ReviewStatusBlock } from "../components/review/ReviewStatusBlock.jsx";
import { WeekComments } from "../components/review/WeekComments.jsx";
import { PageContainer } from "../components/shell/PageContainer.jsx";
import { PageHeader } from "../components/shell/PageHeader.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { InlineError } from "../components/ui/InlineError.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useSeenOnOpen } from "../hooks/useNewMarks.js";
import {
  useReport,
  useRevision,
  useRevisions,
} from "../hooks/useReportQueries.js";
import { firstNameOf, formatWeekRange } from "../lib/format.js";
import { isAuthorOf, weekThreadAccess } from "../lib/permissions.js";
import NotFoundPage from "./NotFoundPage.jsx";

// Review page — /review/:reportId (design §3.6, frontend_architecture.md §9.7). A week
// in full — the same document the week page shows, daily updates included — with a
// right rail of the person, the status, the versions, the overall comments and, for
// someone else's report, the action panel. Managers and admins only (the route guard).
// The top bar's back link returns to the desk with the filters it was opened from.

const weekNumber = (weekKey) => Number(weekKey.slice(6));

export default function ReviewPage() {
  const { reportId } = useParams();
  const location = useLocation();
  const deskSearch = location.state?.deskSearch ?? "";
  const back = { label: "Review desk", to: `/review${deskSearch}` };
  const query = useReport(reportId);
  const week = query.data;

  if (query.isPending) {
    return (
      <>
        <PageHeader title="Review" back={back} />
        <PageContainer>
          <ReviewSkeleton />
        </PageContainer>
      </>
    );
  }

  // Only a report that never loaded is replaced by the error: a failed background
  // refetch keeps what the reviewer is reading on screen.
  if (query.isError && week === undefined) {
    const code = query.error.code;
    if (code === "REPORT_NOT_FOUND") return <NotFoundPage />;
    return (
      <>
        <PageHeader title="Review" back={back} />
        <PageContainer>
          {code === "REPORT_FORBIDDEN" ? (
            <EmptyState
              variant="system"
              title="You don’t have access to this report."
            />
          ) : (
            <InlineError
              title="This report didn’t load."
              onRetry={() => query.refetch()}
            >
              Check your connection and try again.
            </InlineError>
          )}
        </PageContainer>
      </>
    );
  }

  return <ReviewedWeek week={week} back={back} deskSearch={deskSearch} />;
}

function ReviewedWeek({ week, back, deskSearch }) {
  const { user: me } = useAuth();
  const report = week.report;
  const own = isAuthorOf(me, report);
  const [selected, setSelected] = useState(null);
  // A Draft's versions are withheld (R8 answers 403), as on the week page.
  const readable = report.contentSource !== "withheld";
  const revisions = useRevisions(report._id, { enabled: readable });
  const revision = useRevision(report._id, selected);

  // Once per report, after it has loaded — never `report`, so the page keeps the "new"
  // markers it opened with (§9.4, FA11).
  useSeenOnOpen(report._id);

  const number = weekNumber(week.weekKey);
  const firstName = firstNameOf(report.author?.name);
  const { canReply } = weekThreadAccess(me, report);
  const projects = [
    ...new Set(
      report.days.flatMap((d) => d.lines.map((l) => l.task?.project?.name)),
    ),
  ]
    .filter(Boolean)
    .sort();

  return (
    <>
      <PageHeader
        title={`${report.author?.name} · Week ${number}`}
        back={back}
      />
      <PageContainer>
        <div className="print-report grid gap-x-44 gap-y-32 lg:grid-cols-[minmax(0,860px)_320px] print:block">
          <div className="flex min-w-0 flex-col gap-24">
            <ReadOnlyStrip own={own} />
            <div className="flex min-w-0 flex-col gap-44">
              <header className="flex flex-col gap-6">
                <p className="font-mono text-caption text-mut">
                  W{number} · {formatWeekRange(week.weekKey)}
                  {report.revisionNumber > 0 &&
                    ` · rev ${report.revisionNumber}`}
                </p>
                <h2 className="font-display text-page font-bold text-ink">
                  Week {number} report
                </h2>
                <p className="print-only text-base text-body">
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
                author={own}
                manager
              />
              <PrintFooter
                weekNumber={number}
                author={report.author?.name}
                revisionNumber={report.revisionNumber}
              />
            </div>
          </div>

          {/* Wide: a sticky column whose blocks scroll while the action panel stays pinned at
              its foot. Narrow: the blocks come first and the panel is the last child of the
              page grid, stuck to the bottom of the screen. */}
          <aside
            aria-label="Person, status, versions, comments and review"
            className="flex min-w-0 flex-col max-lg:contents lg:sticky lg:top-[calc(94px+var(--demo-h,0px))] lg:max-h-[calc(100dvh-110px-var(--demo-h,0px))] lg:self-start print:hidden"
          >
            <div className="flex min-h-0 min-w-0 flex-col gap-24 max-lg:order-first lg:flex-1 lg:overflow-y-auto lg:pb-24">
              <RailBlock label="Person">
                <ReviewPersonBlock author={report.author} projects={projects} />
              </RailBlock>
              <RailBlock label="Status">
                <ReviewStatusBlock report={report} />
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
                    canStart={false}
                    canReply={canReply}
                  />
                </RailBlock>
              )}
            </div>
            {!own && (
              <ReviewActionPanel
                report={report}
                revisions={revisions.data?.items}
                deskSearch={deskSearch}
                className="shrink-0 max-lg:sticky max-lg:bottom-0 max-lg:z-10 max-lg:order-last"
              />
            )}
          </aside>
        </div>
      </PageContainer>
    </>
  );
}

// Layout-matched (design §3.6 "Loading"): the document and the rail, with the action
// panel drawn disabled rather than left out.
function ReviewSkeleton() {
  return (
    <div className="grid gap-x-44 gap-y-32 lg:grid-cols-[minmax(0,860px)_320px]">
      <div className="flex min-w-0 flex-col gap-24">
        <Skeleton className="h-[40px] w-full" />
        <div className="flex flex-col gap-14">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[64px] w-full" />
          ))}
        </div>
        <DocumentSkeleton />
      </div>
      <div className="flex flex-col gap-24 max-lg:order-first">
        <Skeleton className="h-[44px] w-full" />
        <Skeleton className="h-[60px] w-full" />
        <Skeleton className="h-[96px] w-full" />
        <div
          aria-hidden="true"
          className="flex flex-col gap-11 border-t border-hair bg-tint px-14 py-14 opacity-60"
        >
          <Skeleton className="h-[96px] w-full" />
          <div className="flex gap-8">
            <Skeleton className="h-[40px] w-[88px]" />
            <Skeleton className="h-[40px] w-[96px]" />
            <Skeleton className="h-[40px] w-[116px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
