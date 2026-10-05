import { Navigate, useParams } from "react-router-dom";
import { ReportForm } from "../components/report/ReportForm.jsx";
import { PageContainer } from "../components/shell/PageContainer.jsx";
import { PageHeader } from "../components/shell/PageHeader.jsx";
import { InlineError } from "../components/ui/InlineError.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useWeek } from "../hooks/useReportQueries.js";
import { currentWeekKey } from "../lib/dates.js";

// The weekly form — /reports/:week/edit (design §3.2, frontend_architecture.md §9.3).
// The page decides only whether there is a form to show: no report yet → This week, on
// that week (the days create the report); Submitted or Approved → the filed document;
// Draft or Needs correction → the form, with `Resubmit` and the correction panel when
// it was sent back. The top bar has a back-link and the title only — no week picker,
// no actions: Save and Submit live in the form's sticky bar (one primary per page).

export default function ReportEditPage() {
  const { week: weekKey } = useParams();
  const { user: me } = useAuth();
  const week = useWeek(me._id, weekKey);
  const view = week.data;
  const thisWeekPath = weekKey === currentWeekKey() ? "/" : `/?week=${weekKey}`;

  const header = (
    <PageHeader
      title={`Week ${Number(weekKey.slice(6))} report`}
      back={{ label: "This week", to: thisWeekPath }}
    />
  );

  if (week.isPending) {
    return (
      <>
        {header}
        <PageContainer>
          <div className="mx-auto flex max-w-[var(--form-max)] flex-col gap-32">
            <Skeleton className="h-[60px] w-full" />
            <Skeleton className="h-[320px] w-full" />
            <Skeleton className="h-[200px] w-full" />
          </div>
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
            title="This week’s report didn’t load."
            onRetry={() => week.refetch()}
          >
            Check your connection and try again.
          </InlineError>
        </PageContainer>
      </>
    );
  }

  const report = view.report;
  if (!report) return <Navigate to={thisWeekPath} replace />;
  if (report.status === "submitted" || report.status === "approved") {
    return <Navigate to={`/reports/${weekKey}`} replace />;
  }

  return (
    <>
      {header}
      {/* A new document identity — another report, or its status moving — is a new
          form; nothing else ever resets it (§6.2). */}
      <ReportForm key={`${report._id}:${report.status}`} week={view} />
    </>
  );
}
