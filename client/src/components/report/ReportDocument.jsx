import {
  TASK_TYPES,
  TASK_TYPE_COLORS,
  TASK_TYPE_LABELS,
  WEEKDAY_SHORT,
} from "../../lib/constants.js";
import { formatHours } from "../../lib/format.js";
import { StatusChip } from "../ui/StatusChip.jsx";
import { BlockerRow } from "./BlockerRow.jsx";

// The §3.4 document, section for section the form's numbering (01–06), so a number a
// manager quotes names the same thing the author sees. Shared by the detail page and
// the review page; pure rendering from props — it fetches nothing and owns no
// mutation. A section with nothing in it keeps its heading and a `—`, so the structure
// is the same for everyone.
//
//   week      the WeekView (its `report.content` must be readable, or `revision` given)
//   revision  a Revision (R9) to show instead of the served content

const NONE = <span className="text-mut">—</span>;

function Section({ number, title, children }) {
  return (
    <section aria-labelledby={`doc-${number}`}>
      <h3
        id={`doc-${number}`}
        className="flex break-after-avoid items-baseline gap-11 border-b border-hair pb-14 font-display text-panel font-bold text-ink"
      >
        <span className="font-mono text-dense font-normal text-mut">
          {number}
        </span>
        {title}
      </h3>
      <div className="pt-14">{children}</div>
    </section>
  );
}

// One shape for the live report and a snapshot, so the sections don't care which.
function modelOf(report, revision) {
  if (!revision) {
    return {
      days: report.days,
      content: report.content,
      tasks: report.tasks,
      hoursByType: report.hoursByType,
      live: true,
    };
  }
  const hoursByTask = new Map();
  const hoursByType = Object.fromEntries(TASK_TYPES.map((t) => [t, 0]));
  for (const day of revision.days) {
    for (const line of day.lines) {
      const id = line.task?._id;
      hoursByTask.set(id, (hoursByTask.get(id) ?? 0) + line.hours);
      hoursByType[line.taskType] += line.hours;
    }
  }
  return {
    days: revision.days,
    content: revision.content,
    tasks: revision.content.tasks.map((t) => ({
      ...t,
      hours: hoursByTask.get(t.task?._id) ?? 0,
    })),
    hoursByType,
    live: false,
  };
}

export function ReportDocument({ week, revision = null }) {
  const model = modelOf(week.report, revision);
  const { content } = model;
  const blockers = model.days.flatMap((day) =>
    day.blockers.map((blocker) => ({ day: day.weekday, blocker })),
  );
  const total = TASK_TYPES.reduce((sum, t) => sum + model.hoursByType[t], 0);

  return (
    <div data-tour="report-document" className="flex flex-col gap-44">
      <Section number="01" title="Tasks">
        {model.tasks.length === 0 ? (
          NONE
        ) : (
          <ul className="flex flex-col">
            {model.tasks.map((row) => (
              <li
                key={row.task?._id}
                className="border-b border-hair py-8 first:pt-0 last:border-b-0"
              >
                <div className="flex flex-wrap items-center gap-x-14 gap-y-4">
                  <span className="min-w-0 flex-1 text-base font-medium text-ink">
                    {row.task?.name}
                    {row.task?.project && (
                      <span className="ml-8 text-dense font-normal text-mut">
                        {row.task.project.name}
                      </span>
                    )}
                  </span>
                  {row.status ? (
                    <StatusChip kind="task" value={row.status} size="sm" />
                  ) : (
                    NONE
                  )}
                  <span className="w-[56px] text-right font-mono text-dense text-ink">
                    {formatHours(row.hours)} h
                  </span>
                </div>
                {row.note && (
                  <p className="mt-4 text-dense break-words text-body">
                    {row.note}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section number="02" title="Planned for next week">
        {content.nextWeek.length === 0 ? (
          NONE
        ) : (
          <ul className="flex list-none flex-col gap-6">
            {content.nextWeek.map((item, index) => (
              <li key={index} className="text-base break-words text-body">
                {item}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section number="03" title="Blockers">
        {blockers.length === 0 ? (
          NONE
        ) : (
          <ul className="flex flex-col">
            {blockers.map(({ day, blocker }) => (
              <BlockerRow
                key={blocker._id}
                blocker={blocker}
                dayLabel={WEEKDAY_SHORT[day]}
              />
            ))}
          </ul>
        )}
      </Section>

      <Section number="04" title="Achievements">
        {content.achievements.length === 0 ? (
          NONE
        ) : (
          <ul className="flex flex-col gap-6">
            {content.achievements.map((achievement) => (
              <li
                key={achievement._id}
                className={
                  achievement.isKey
                    ? "relative py-2 pl-11 before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-acc"
                    : "py-2"
                }
              >
                <span className="text-base break-words text-body">
                  {achievement.text}
                </span>
                {achievement.isKey && (
                  <span className="ml-11 text-micro font-medium text-acc-txt">
                    Key
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section number="05" title="Hours by task type">
        <ul>
          {TASK_TYPES.map((type) => (
            <li
              key={type}
              className="flex items-center gap-11 border-b border-hair py-6"
            >
              <span
                aria-hidden="true"
                className="inline-block h-[14px] w-[4px]"
                style={{ background: TASK_TYPE_COLORS[type] }}
              />
              <span className="flex-1 text-base text-body">
                {TASK_TYPE_LABELS[type]}
              </span>
              <span className="font-mono text-dense text-ink">
                {formatHours(model.hoursByType[type])} h
              </span>
            </li>
          ))}
          <li className="flex items-center justify-between bg-tint2 px-11 py-8 text-base font-medium text-ink">
            <span>Total</span>
            <span className="font-mono text-dense">{formatHours(total)} h</span>
          </li>
        </ul>
      </Section>

      <Section number="06" title="Notes & links">
        {!content.notes && content.links.length === 0 ? (
          NONE
        ) : (
          <div className="flex flex-col gap-14">
            {content.notes && (
              <p className="text-base break-words whitespace-pre-wrap text-body">
                {content.notes}
              </p>
            )}
            {content.links.length > 0 && (
              <ul className="flex flex-col gap-4">
                {content.links.map((link, index) => (
                  <li key={index} className="text-base">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-acc-txt underline underline-offset-2"
                    >
                      {link.label || link.url}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}
