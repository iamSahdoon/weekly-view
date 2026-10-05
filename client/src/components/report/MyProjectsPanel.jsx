import { formatProgress } from "../../lib/format.js";
import { ProjectProgress } from "../project/ProjectProgress.jsx";
import { SegmentedControl } from "../ui/SegmentedControl.jsx";

// My projects on This week (design §3.1): one row per active project the person is
// assigned to — name, the §6.25 bar, and "8 days left" or "overdue by 2 days". The
// Days | Hours toggle in the header switches every bar at once. The page leaves the
// panel out when there are no projects.

const UNITS = [
  { value: "days", label: "Days" },
  { value: "hours", label: "Hours" },
];

export function MyProjectsPanel({ projects, unit, onUnitChange }) {
  return (
    <section
      aria-labelledby="my-projects"
      className="flex flex-col border border-hair bg-card"
    >
      <header className="flex h-44 items-center justify-between gap-11 border-b border-hair px-20">
        <h2
          id="my-projects"
          className="font-display text-panel font-bold text-ink"
        >
          My projects
        </h2>
        <SegmentedControl
          value={unit}
          onChange={onUnitChange}
          options={UNITS}
          ariaLabel="Show progress in"
        />
      </header>
      <ul className="flex flex-col">
        {projects.map((project) => (
          <li
            key={project._id}
            className="flex flex-col gap-8 border-b border-hair px-20 py-14 last:border-b-0"
          >
            <div className="flex items-baseline justify-between gap-11">
              <span className="min-w-0 truncate text-dense font-medium text-ink">
                {project.name}
              </span>
              <span
                className={
                  project.progress?.overdueDays > 0 && unit === "days"
                    ? "shrink-0 text-caption text-st-corr-fg"
                    : "shrink-0 text-caption text-mut"
                }
              >
                {formatProgress(project.progress, unit)}
              </span>
            </div>
            <ProjectProgress progress={project.progress} unit={unit} />
          </li>
        ))}
      </ul>
    </section>
  );
}
