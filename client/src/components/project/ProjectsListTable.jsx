import { progressText } from "../../lib/dashboardData.js";
import { cn } from "../../lib/cn.js";
import { formatDateLong } from "../../lib/format.js";
import { AvatarStack } from "../ui/AvatarStack.jsx";
import { Button } from "../ui/Button.jsx";
import { SegmentedControl } from "../ui/SegmentedControl.jsx";
import { Table } from "../ui/Table.jsx";
import { ProjectProgress } from "./ProjectProgress.jsx";

// The Projects page's table (design §3.9): name · start · the §6.25 bar · days or hours
// (a `Days | Hours` control in the header picks which) · people · Edit, Extend plan (Set
// plan without one), Delete. A project with no plan says `No plan` in the progress
// columns. Overdue is words, as on the dashboard: the bar full with its overrun segment
// and the figure in the Needs-correction colour — information, not an alarm.

const UNITS = [
  { value: "days", label: "Days" },
  { value: "hours", label: "Hours" },
];

export function ProjectsListTable({
  rows,
  peopleById,
  unit,
  onUnitChange,
  onEdit,
  onPlan,
  onDelete,
  emptyState,
  isLoading = false,
}) {
  const columns = [
    {
      id: "name",
      header: "Name",
      cell: (row) => <span className="font-medium text-ink">{row.name}</span>,
    },
    {
      id: "start",
      header: "Start",
      width: 130,
      mono: true,
      cell: (row) =>
        row.progress?.plan ? formatDateLong(row.progress.plan.startDate) : "—",
    },
    {
      id: "progress",
      header: "Progress",
      width: 220,
      mobile: "hidden",
      cell: (row) =>
        row.progress?.plan ? (
          <ProjectProgress progress={row.progress} unit={unit} />
        ) : (
          <span className="text-mut">No plan</span>
        ),
    },
    {
      id: "figure",
      header: (
        <SegmentedControl
          ariaLabel="Show progress in"
          value={unit}
          onChange={onUnitChange}
          options={UNITS}
        />
      ),
      label: unit === "hours" ? "Hours" : "Days",
      width: 190,
      cell: (row) =>
        row.progress?.plan ? (
          <span
            className={cn(
              "font-mono text-caption tabular-nums",
              unit === "days" && row.progress.overdueDays > 0
                ? "text-st-corr-fg"
                : "text-body",
            )}
          >
            {progressText(row.progress, unit)}
          </span>
        ) : (
          <span className="text-mut">No plan</span>
        ),
    },
    {
      id: "people",
      header: "People",
      width: 130,
      mobile: "hidden",
      cell: (row) => {
        const people = (row.memberIds ?? [])
          .map((id) => peopleById.get(id))
          .filter(Boolean);
        return people.length ? (
          <AvatarStack people={people} />
        ) : (
          <span className="text-mut">No one yet</span>
        );
      },
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      width: 250,
      mobile: "hidden",
      cell: (row) => (
        <span className="inline-flex items-center justify-end gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(row)}
            aria-label={`Edit ${row.name}`}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPlan(row)}
            aria-label={`${row.progress?.plan ? "Extend" : "Set"} plan for ${row.name}`}
          >
            {row.progress?.plan ? "Extend plan" : "Set plan"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(row)}
            aria-label={`Delete ${row.name}`}
          >
            Delete
          </Button>
        </span>
      ),
    },
  ];
  return (
    <Table
      columns={columns}
      rows={rows}
      isLoading={isLoading}
      skeletonRows={5}
      emptyState={emptyState}
      caption="Projects"
    />
  );
}
