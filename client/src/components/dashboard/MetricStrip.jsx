import { formatPercent, formatRelative } from "../../lib/format.js";
import { InlineError } from "../ui/InlineError.jsx";
import { QueryView } from "../ui/QueryView.jsx";
import { Skeleton } from "../ui/Skeleton.jsx";
import { MetricCell, Num } from "./MetricCell.jsx";

// The four metrics in ONE panel with hairlines between them (design §7.1, §3.7): 4 across,
// 2×2 below 900px, one column below 640px. The hairlines are the grid's 1px gap over a
// --hair ground. Numbers come from D1 and ignore the team table's status filter.

const GRID =
  "grid grid-cols-4 gap-px border border-hair bg-hair max-[899px]:grid-cols-2 max-[639px]:grid-cols-1";

const people = (n) => (n === 1 ? "1 person" : `${n} people`);

function metricsOf(summary, now = new Date()) {
  const { needsCorrection, openBlockers, complianceTrailing } = summary;
  const trailing =
    complianceTrailing?.rate == null
      ? null
      : formatPercent(complianceTrailing.rate);
  return [
    {
      label: "Filed this week",
      tone: "acc",
      value: String(summary.filed),
      unit: `/ ${summary.expected}`,
      sub: (
        <>
          <Num>{summary.notFiled}</Num> not yet filed
          {summary.onLeave > 0 && (
            <>
              {" "}
              · <Num>{summary.onLeave}</Num> on leave
            </>
          )}
        </>
      ),
    },
    {
      label: "Compliance",
      tone: "ok",
      value: formatPercent(summary.compliance),
      sub: trailing ? (
        <>
          this week · <Num>{trailing}</Num> over{" "}
          <Num>{complianceTrailing.weeks}</Num> weeks
        </>
      ) : (
        "this week"
      ),
    },
    {
      label: "Needs correction",
      value: String(needsCorrection.count),
      tone: "corr",
      sub:
        needsCorrection.count > 0 && needsCorrection.oldestSentBackAt ? (
          <>
            oldest sent back{" "}
            {formatRelative(needsCorrection.oldestSentBackAt, now)}
          </>
        ) : null,
    },
    {
      label: "Open blockers",
      tone: "warn",
      value: String(openBlockers.count),
      sub:
        openBlockers.count > 0 ? (
          <>
            raised by <Num>{people(openBlockers.peopleCount)}</Num>
          </>
        ) : null,
    },
  ];
}

function StripSkeleton() {
  return (
    <div className={GRID} aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="min-h-[92px] bg-card px-24 py-20">
          <Skeleton className="h-[12px] w-[40%]" />
          <Skeleton className="mt-11 h-[34px] w-[30%]" />
          <Skeleton className="mt-8 h-[12px] w-[60%]" />
        </div>
      ))}
    </div>
  );
}

export function MetricStrip({ query }) {
  return (
    <QueryView
      query={query}
      skeleton={<StripSkeleton />}
      error={
        <InlineError
          title="The week’s numbers didn’t load."
          onRetry={() => query.refetch()}
        >
          Check your connection and try again.
        </InlineError>
      }
    >
      {(summary) => (
        <section
          aria-label="This week in numbers"
          data-tour="metric-strip"
          className={GRID}
        >
          {metricsOf(summary).map((metric) => (
            <MetricCell key={metric.label} {...metric} />
          ))}
        </section>
      )}
    </QueryView>
  );
}
