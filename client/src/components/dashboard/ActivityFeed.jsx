import { Link } from "react-router-dom";
import { activityTarget } from "../../lib/dashboardData.js";
import { personWeekHref } from "../../lib/dashboardParams.js";
import { formatDateTime } from "../../lib/format.js";
import { InlineError } from "../ui/InlineError.jsx";
import { QueryView } from "../ui/QueryView.jsx";
import { Skeleton } from "../ui/Skeleton.jsx";
import { StatusChip } from "../ui/StatusChip.jsx";
import { SampleDataPill } from "../ui/SampleDataPill.jsx";

// Recent activity (design §7.4): not a chart. Eight 44px rows — a mono timestamp in --mut,
// who, what they did, to which week, and that report's status now. Verbs are `submitted`,
// `approved` and `sent back` and nothing else; there is no "All activity" (requirements
// §6). Not scoped to the week in the picker: it is what happened lately. The list is
// always eight rows tall, so the row of panels it shares doesn't change height as the
// events arrive.

const ROWS = 8;
const VERB = {
  submitted: "submitted",
  approved: "approved",
  sent_back: "sent back",
};

function FeedSkeleton() {
  return (
    <ul aria-hidden="true">
      {Array.from({ length: ROWS }, (_, i) => (
        <li
          key={i}
          className="flex h-44 items-center gap-14 border-b border-hair px-24 last:border-b-0"
        >
          <Skeleton className="h-[12px] w-[72px]" />
          <Skeleton className="h-[14px] w-[55%]" />
        </li>
      ))}
    </ul>
  );
}

export function ActivityFeed({ query, meId, className }) {
  return (
    <section
      aria-label="Recent activity"
      className={`flex min-w-0 flex-col border border-hair bg-card ${className ?? ""}`}
    >
      <header className="flex min-h-[44px] items-center border-b border-hair px-24">
        <div className="flex min-w-0 items-center gap-8">
          <h2 className="font-display text-panel-sm font-bold text-ink">
            Recent activity
          </h2>
          <SampleDataPill />
        </div>
      </header>
      <div className="min-h-[352px]">
        <QueryView
          query={query}
          skeleton={<FeedSkeleton />}
          error={
            <div className="p-24">
              <InlineError
                title="Recent activity didn’t load."
                onRetry={() => query.refetch()}
              >
                Check your connection and try again.
              </InlineError>
            </div>
          }
          isEmpty={(data) => data.items.length === 0}
          empty={
            <p className="px-24 py-20 text-dense text-mut">
              Nothing has been submitted yet.
            </p>
          }
        >
          {(data) => (
            <ul>
              {data.items.map((event) => (
                <li
                  key={`${event.type}:${event.report._id}:${event.revisionNumber}:${event.at}`}
                  className="border-b border-hair last:border-b-0"
                >
                  <Link
                    to={personWeekHref(
                      event.report.author?._id,
                      meId,
                      event.report.weekKey,
                    )}
                    className="focus-inset flex h-44 items-center gap-14 px-24 text-dense text-body transition-colors duration-[120ms] ease-linear hover:bg-tint"
                  >
                    <span className="w-[88px] shrink-0 font-mono text-micro text-mut">
                      {formatDateTime(event.at)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium text-ink">
                        {event.actor?.name ?? "Someone"}
                      </span>{" "}
                      {VERB[event.type]} {activityTarget(event)}
                    </span>
                    <StatusChip
                      value={event.report.status}
                      size="sm"
                      className="max-sm:hidden"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </QueryView>
      </div>
    </section>
  );
}
