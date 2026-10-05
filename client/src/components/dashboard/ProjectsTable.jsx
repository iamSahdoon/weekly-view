import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/cn.js";
import { formatDate, formatDateLong, formatHours } from "../../lib/format.js";
import { progressText } from "../../lib/dashboardData.js";
import { ProjectProgress } from "../project/ProjectProgress.jsx";
import { AvatarStack } from "../ui/AvatarStack.jsx";
import { Button } from "../ui/Button.jsx";
import { EmptyState } from "../ui/EmptyState.jsx";
import { InlineError } from "../ui/InlineError.jsx";
import { QueryView } from "../ui/QueryView.jsx";
import { SegmentedControl } from "../ui/SegmentedControl.jsx";
import { Skeleton } from "../ui/Skeleton.jsx";

// The projects table (design §3.7): one row per active project with a plan — name, start
// date, the §6.25 progress bar, the days or hours figure (a `Days | Hours` control in the
// header picks which), and who works on it. A row opens to show each person, their hours
// this week and in total, and their last day on it. The row menu's `Extend plan` (managers
// and admins) is `onExtend`: C8 brings PlanModal and passes it; without it there is no menu.

const UNITS = [
  { value: "days", label: "Days" },
  { value: "hours", label: "Hours" },
];

const COLUMNS =
  "md:grid-cols-[minmax(0,1.4fr)_104px_minmax(120px,1fr)_168px_112px]";

function ProjectRow({ item, unit, onExtend }) {
  const [open, setOpen] = useState(false);
  const panelId = `project-${item.project._id}`;
  const overdue = unit === "days" && item.progress.overdueDays > 0;
  return (
    <li className="border-b border-hair last:border-b-0">
      <div className="flex items-center">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "focus-inset grid min-h-[var(--row-h)] flex-1 grid-cols-1 items-center gap-x-16 gap-y-6 px-20 py-11 text-left transition-colors duration-[120ms] ease-linear hover:bg-tint",
            COLUMNS,
          )}
        >
          <span className="flex min-w-0 items-center gap-8 font-medium text-ink">
            <ChevronRight
              aria-hidden="true"
              className={cn(
                "size-[14px] shrink-0 text-mut transition-transform duration-[160ms] ease-out",
                open && "rotate-90",
              )}
            />
            <span className="truncate">{item.project.name}</span>
          </span>
          <span className="font-mono text-caption text-mut max-md:hidden">
            {formatDateLong(item.progress.plan.startDate)}
          </span>
          <span className="min-w-0 max-md:order-last">
            <ProjectProgress progress={item.progress} unit={unit} />
          </span>
          <span
            className={cn(
              "font-mono text-caption tabular-nums",
              overdue ? "text-st-corr-fg" : "text-body",
            )}
          >
            {progressText(item.progress, unit)}
          </span>
          <span className="max-md:hidden">
            <AvatarStack people={item.people.map((p) => p.user)} />
          </span>
        </button>
        {onExtend && (
          <Button
            variant="ghost"
            size="sm"
            className="mr-14 shrink-0"
            onClick={() => onExtend(item.project)}
            aria-label={`Extend plan for ${item.project.name}`}
          >
            Extend plan
          </Button>
        )}
      </div>
      {open && (
        <div id={panelId} className="border-t border-hair bg-tint px-20 py-14">
          {item.people.length === 0 ? (
            <p className="text-dense text-mut">
              No one has logged time on this yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-8">
              {item.people.map((person) => (
                <li
                  key={person.user._id}
                  className="flex flex-wrap items-baseline gap-x-20 gap-y-2 text-dense"
                >
                  <span className="min-w-[140px] font-medium text-ink">
                    {person.user.name}
                  </span>
                  <span className="text-body">
                    <span className="font-mono tabular-nums">
                      {formatHours(person.hoursThisWeek)} h
                    </span>{" "}
                    this week
                  </span>
                  <span className="text-body">
                    <span className="font-mono tabular-nums">
                      {formatHours(person.hoursTotal)} h
                    </span>{" "}
                    in total
                  </span>
                  <span className="text-mut">
                    last on it{" "}
                    {person.lastDay ? formatDate(person.lastDay) : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

function ProjectsSkeleton() {
  return (
    <ul aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="flex h-[var(--row-h)] items-center gap-16 border-b border-hair px-20 last:border-b-0"
        >
          <Skeleton className="h-[14px] w-[22%]" />
          <Skeleton className="h-[4px] flex-1" />
          <Skeleton className="h-[14px] w-[14%]" />
        </li>
      ))}
    </ul>
  );
}

export function ProjectsTable({ query, unit, onUnitChange, onExtend }) {
  return (
    <section aria-label="Projects" className="border border-hair bg-card">
      <header className="flex min-h-[44px] flex-wrap items-center justify-between gap-11 border-b border-hair px-20 py-6">
        <h2 className="font-display text-panel-sm font-bold text-ink">
          Projects
        </h2>
        <SegmentedControl
          ariaLabel="Show progress in"
          value={unit}
          onChange={onUnitChange}
          options={UNITS}
        />
      </header>
      <QueryView
        query={query}
        skeleton={<ProjectsSkeleton />}
        error={
          <div className="p-20">
            <InlineError
              title="The projects table didn’t load."
              onRetry={() => query.refetch()}
            >
              Check your connection and try again.
            </InlineError>
          </div>
        }
        isEmpty={(data) => data.items.length === 0}
        empty={
          <EmptyState
            title="No project has a plan yet."
            action={
              <Button variant="secondary" asChild>
                <Link to="/projects">Open projects</Link>
              </Button>
            }
          />
        }
      >
        {(data) => (
          <ul>
            {data.items.map((item) => (
              <ProjectRow
                key={item.project._id}
                item={item}
                unit={unit}
                onExtend={onExtend}
              />
            ))}
          </ul>
        )}
      </QueryView>
    </section>
  );
}
