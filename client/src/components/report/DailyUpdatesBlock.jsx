import { addDays } from "date-fns";
import { useAuth } from "../../hooks/useAuth.js";
import {
  useResolveBlocker,
  useTeamComments,
} from "../../hooks/useReportQueries.js";
import {
  TASK_TYPE_COLORS,
  TASK_TYPE_LABELS,
  WEEKDAYS,
  WEEKDAY_SHORT,
} from "../../lib/constants.js";
import { weekStartOf } from "../../lib/dates.js";
import { formatDate, firstNameOf, formatHours } from "../../lib/format.js";
import {
  canResolveBlocker,
  canToggleTeamComments,
} from "../../lib/permissions.js";
import { CommentThread, StartThread } from "../comment/CommentThread.jsx";
import { NewMarker } from "../ui/NewMarker.jsx";
import { Switch } from "../ui/Switch.jsx";
import { BlockerRow } from "./BlockerRow.jsx";

// The five days, Monday to Friday (design §3.4), read-only except for the three things
// a reader may do: resolve a blocker, open a day to team comments, comment. Each
// posted day shows its work lines as a dense table, its blockers, then its comment
// threads. A day that isn't posted says why in a line. It owns the resolve and
// team-comment mutations through hooks (frontend_architecture.md §8.3).

const STATE_LINES = {
  today: "Not posted yet",
  future: "Not yet",
  holiday: "Holiday",
  leave: "On leave",
  not_on_team: "Not on the team yet",
};

function DayHeading({ weekday, date, hours }) {
  return (
    <div className="flex items-baseline gap-8 sm:flex-col sm:gap-2">
      <span className="text-dense font-medium text-ink">
        {WEEKDAY_SHORT[weekday]}
      </span>
      <span className="font-mono text-micro text-mut">{formatDate(date)}</span>
      {hours != null && (
        <span className="font-mono text-micro text-mut sm:mt-4">
          {formatHours(hours)} h
        </span>
      )}
    </div>
  );
}

// Below 640px a row of five columns can't fit, so each line stacks: task and hours on
// one line, the type and what was done beneath.
function StackedLines({ lines }) {
  return (
    <ul className="flex flex-col sm:hidden">
      {lines.map((line) => (
        <li key={line._id} className="border-t border-hair py-8">
          <div className="flex items-baseline justify-between gap-11">
            <span className="min-w-0 text-dense font-medium text-ink">
              {line.task?.name ?? "Task"}
              {line.task?.project && (
                <span className="ml-6 text-micro font-normal text-mut">
                  {line.task.project.name}
                </span>
              )}
            </span>
            <span className="shrink-0 font-mono text-dense text-ink">
              {formatHours(line.hours)} h
            </span>
          </div>
          <p className="mt-2 inline-flex items-center gap-6 text-micro text-mut">
            <span
              aria-hidden="true"
              className="inline-block h-[10px] w-[4px]"
              style={{ background: TASK_TYPE_COLORS[line.taskType] }}
            />
            {TASK_TYPE_LABELS[line.taskType]}
          </p>
          <p className="mt-2 text-dense break-words text-body">{line.text}</p>
        </li>
      ))}
    </ul>
  );
}

function WorkLines({ lines }) {
  return (
    <>
      <StackedLines lines={lines} />
      <LinesTable lines={lines} />
    </>
  );
}

function LinesTable({ lines }) {
  return (
    <div className="hidden overflow-x-auto sm:block">
      <table className="w-full min-w-[560px] table-fixed border-collapse text-left">
        <colgroup>
          <col className="w-[27%]" />
          <col className="w-[21%]" />
          <col />
          <col className="w-[64px]" />
        </colgroup>
        <thead>
          <tr className="text-micro font-medium text-mut">
            <th className="py-4 pr-14 font-medium">Task</th>
            <th className="py-4 pr-14 font-medium">Type</th>
            <th className="py-4 pr-14 font-medium">What was done</th>
            <th className="py-4 text-right font-medium">Hours</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line._id} className="border-t border-hair align-top">
              <td className="py-6 pr-14 text-dense">
                <span className="block font-medium text-ink">
                  {line.task?.name ?? "Task"}
                </span>
                {line.task?.project && (
                  <span className="block text-micro text-mut">
                    {line.task.project.name}
                  </span>
                )}
              </td>
              <td className="py-6 pr-14 text-dense whitespace-nowrap text-body">
                <span className="inline-flex items-center gap-6">
                  <span
                    aria-hidden="true"
                    className="inline-block h-[12px] w-[4px]"
                    style={{ background: TASK_TYPE_COLORS[line.taskType] }}
                  />
                  {TASK_TYPE_LABELS[line.taskType]}
                </span>
              </td>
              <td className="py-6 pr-14 text-dense break-words text-body">
                {line.text}
              </td>
              <td className="py-6 text-right font-mono text-dense text-ink">
                {formatHours(line.hours)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PostedDay({ week, day, canResolve, canToggle, resolve, toggleTeam }) {
  const report = week.report;
  const ownerName = firstNameOf(report.author?.name);
  const target = { kind: "day", reportId: report._id, weekday: day.weekday };
  const isNew = day.comments.some((thread) => thread.isNew);
  const count = day.comments.reduce((n, t) => n + 1 + t.replies.length, 0);

  return (
    <div className="flex min-w-0 flex-col gap-14">
      <div className="flex flex-wrap items-center justify-between gap-x-20 gap-y-6">
        <span className="inline-flex items-center gap-8 text-dense text-mut">
          {count > 0 ? (
            <>
              {isNew && <NewMarker />}
              {count} {count === 1 ? "comment" : "comments"}
            </>
          ) : (
            "No comments"
          )}
        </span>
        {canToggle ? (
          <Switch
            checked={day.openToTeam}
            onCheckedChange={(open) =>
              toggleTeam.mutate({ weekday: day.weekday, open })
            }
            label="Open to team comments"
          />
        ) : (
          day.openToTeam && (
            <span className="text-dense text-mut">Open to team comments</span>
          )
        )}
      </div>

      <WorkLines lines={day.lines} />

      {day.blockers.length > 0 && (
        <ul className="flex flex-col">
          {day.blockers.map((blocker) => (
            <BlockerRow
              key={blocker._id}
              blocker={blocker}
              onResolve={
                canResolve
                  ? (resolved) =>
                      resolve.mutate({ blockerId: blocker._id, resolved })
                  : undefined
              }
            />
          ))}
        </ul>
      )}

      {(day.comments.length > 0 || day.canComment) && (
        <div className="flex flex-col gap-11">
          {day.comments.map((thread) => (
            <CommentThread
              key={thread._id}
              thread={thread}
              target={target}
              canReply={day.canComment}
              ownerName={ownerName}
            />
          ))}
          {day.canComment && (
            <StartThread target={target} ownerName={ownerName} />
          )}
        </div>
      )}
      {!day.canComment && (
        <p className="text-dense text-mut">
          Comments on this update are limited to {ownerName} and managers.
        </p>
      )}
    </div>
  );
}

/**
 * One posted day with the reader's three actions, for a page that shows a single day
 * (the day panel on This week). Owns the same two mutations as the block.
 */
export function PostedUpdate({ week, day }) {
  const { user: me } = useAuth();
  const resolve = useResolveBlocker(week);
  const toggleTeam = useTeamComments(week);
  return (
    <PostedDay
      week={week}
      day={day}
      canResolve={canResolveBlocker(me, week.report)}
      canToggle={canToggleTeamComments(me, week.report)}
      resolve={resolve}
      toggleTeam={toggleTeam}
    />
  );
}

export function DailyUpdatesBlock({ week }) {
  const { user: me } = useAuth();
  const report = week.report;
  const resolve = useResolveBlocker(week);
  const toggleTeam = useTeamComments(week);
  const canResolve = canResolveBlocker(me, report);
  const canToggle = canToggleTeamComments(me, report);
  const monday = weekStartOf(week.weekKey);

  return (
    <section aria-labelledby="daily-updates" className="flex flex-col">
      <h2
        id="daily-updates"
        className="border-b border-hair pb-14 font-display text-panel font-bold text-ink"
      >
        Daily updates
      </h2>
      <ol>
        {WEEKDAYS.map((weekday, index) => {
          const day = report.days.find((d) => d.weekday === weekday);
          const date = addDays(monday, index);
          const state = week.dayStates[weekday];
          return (
            <li
              key={weekday}
              className="grid gap-x-20 gap-y-8 border-b border-hair py-14 last:border-b-0 sm:grid-cols-[72px_minmax(0,1fr)]"
            >
              <DayHeading weekday={weekday} date={date} hours={day?.hours} />
              {day ? (
                <PostedDay
                  week={week}
                  day={day}
                  canResolve={canResolve}
                  canToggle={canToggle}
                  resolve={resolve}
                  toggleTeam={toggleTeam}
                />
              ) : state === "missing" ? (
                <p className="text-dense font-medium text-st-corr-fg">
                  Missing
                </p>
              ) : (
                <p className="text-dense text-mut">
                  {STATE_LINES[state] ?? "—"}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
