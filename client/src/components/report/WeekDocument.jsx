import { revisionOutcome } from "../../lib/format.js";
import { InlineError } from "../ui/InlineError.jsx";
import { Skeleton } from "../ui/Skeleton.jsx";
import { ReportDocument } from "./ReportDocument.jsx";
import { RevisionsRail } from "./RevisionsRail.jsx";
import {
  CorrectingBanner,
  DraftNote,
  RevisionBanner,
  TeammateNote,
} from "./WeekNotices.jsx";

// The part of a week page that depends on what the response contains (design §3.4),
// shared by the week page and the review page (§3.6: "exactly the §3.4 rendering").
// It fetches nothing: the page passes the chosen version's query and the list.

/**
 * The end-of-week document, or the note that stands in for it.
 *
 *   week          the WeekView
 *   selected      a revision number chosen in the rail, or null for the current one
 *   revision      that version's query (R9) when `selected` is set
 *   revisions     R8's items, to word the version banner
 *   author / manager  whether the viewer is the report's author / a manager or admin
 */
export function WeekDocument({
  week,
  selected,
  revision,
  onBack,
  revisions,
  firstName,
  author,
  manager,
}) {
  const report = week.report;

  // A past version chosen in the rail.
  if (selected != null) {
    const summary = revisions?.find((r) => r.revisionNumber === selected);
    return (
      <div className="flex flex-col gap-24">
        <RevisionBanner
          revisionNumber={selected}
          outcome={summary ? revisionOutcome(summary) : "earlier version"}
          onBack={onBack}
        />
        {revision.isPending ? (
          <DocumentSkeleton />
        ) : revision.isError && revision.data === undefined ? (
          <InlineError
            title="This version didn’t load."
            onRetry={() => revision.refetch()}
          />
        ) : (
          <ReportDocument week={week} revision={revision.data} />
        )}
      </div>
    );
  }

  if (report.content === null) {
    // Withheld. A teammate is told why; a manager on a Draft is told what is coming.
    if (!author && !manager) return <TeammateNote />;
    return <DraftNote authorFirstName={firstName} />;
  }

  return (
    <div className="flex flex-col gap-24">
      {report.contentSource === "revision" && (
        <CorrectingBanner
          authorFirstName={firstName}
          sentBackAt={report.latestComment?.createdAt}
        />
      )}
      <ReportDocument week={week} />
    </div>
  );
}

/** The rail's "Versions" content: loading, failed, or the selectable list. */
export function VersionsList({ revisions, selected, onSelect }) {
  if (revisions.isPending) {
    return <p className="text-dense text-mut">Loading versions…</p>;
  }
  if (revisions.isError && revisions.data === undefined) {
    return (
      <p className="text-dense text-mut">
        Versions didn’t load.{" "}
        <button
          type="button"
          className="underline underline-offset-2"
          onClick={() => revisions.refetch()}
        >
          Try again
        </button>
      </p>
    );
  }
  return (
    <RevisionsRail
      revisions={revisions.data.items}
      selected={selected}
      onSelect={onSelect}
    />
  );
}

/** A labelled block of a week page's right rail. */
export function RailBlock({ label, tour, children }) {
  return (
    <section
      data-tour={tour}
      className="flex flex-col gap-8 border-t border-hair pt-14 first:border-t-0 first:pt-0"
    >
      <h3 className="text-caption font-medium text-mut">{label}</h3>
      {children}
    </section>
  );
}

export function DocumentSkeleton() {
  return (
    <div className="flex flex-col gap-44">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-14">
          <Skeleton className="h-[24px] w-[220px]" />
          <Skeleton className="h-[72px] w-full" />
        </div>
      ))}
    </div>
  );
}
