import { addDays } from "date-fns";
import { MessageSquare } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import {
  useResolveBlocker,
  useTeamComments,
} from "../../hooks/useReportQueries.js";
import {
  TASK_TYPE_COLORS,
  TASK_TYPE_LABELS,
  WEEKDAYS,
  WEEKDAY_LABELS,
} from "../../lib/constants.js";
import { weekStartOf } from "../../lib/dates.js";
import { cn } from "../../lib/cn.js";
import { formatDate, firstNameOf, formatHours } from "../../lib/format.js";
import {
  canResolveBlocker,
  canToggleTeamComments,
} from "../../lib/permissions.js";
import { CommentThread, StartThread } from "../comment/CommentThread.jsx";
import { NewMarker } from "../ui/NewMarker.jsx";
import { StatusChip } from "../ui/StatusChip.jsx";
import { Switch } from "../ui/Switch.jsx";
import { BlockerRow } from "./BlockerRow.jsx";

// The five days, Monday to Friday (design §3.4), each its own card on --card with 16px
// between them. A posted day is a header (weekday and date, hours, comment count, the
// "Open to team comments" switch), then three hairline-separated sections: the work
// lines, the blockers, the conversation. A day that isn't posted is a short, calm card
// that says why. Read-only except for what a reader may do: resolve a blocker, open a day
// to team comments, comment. The block owns the resolve and team-comment mutations
// through hooks (frontend_architecture.md §8.3). `DayControls` and `PostedUpdate` split
// the same card so This week and Team updates, which have their own headers, share it.

const SECTION = "px-20 py-14 border-t border-hair first:border-t-0";
const LABEL = "text-micro font-medium text-mut";

const commentCount = (day) =>
  day.comments.reduce((n, t) => n + 1 + t.replies.length, 0);

// What a day has said and who may change it: the count, and the switch for the author
// and managers (a small label for everyone else, when the day is open).
function Controls({ day, canToggle, toggleTeam }) {
  const count = commentCount(day);
  const isNew = day.comments.some((thread) => thread.isNew);
  return (
    <div className="flex flex-wrap items-center gap-x-16 gap-y-6">
      <span
        className="inline-flex items-center gap-6 text-dense text-mut"
        data-testid="day-comment-count"
      >
        {isNew && <NewMarker />}
        <MessageSquare aria-hidden="true" className="size-[13px]" />
        {count > 0
          ? `${count} ${count === 1 ? "comment" : "comments"}`
          : "No comments"}
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
  );
}

// Below 640px a row of four columns can't fit, so each line stacks: task and hours on
// one line, the type and what was done beneath.
function StackedLines({ lines }) {
  return (
    <ul className="flex flex-col sm:hidden">
      {lines.map((line) => (
        <li
          key={line._id}
          className="border-t border-hair py-11 first:border-t-0 first:pt-0"
        >
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
          <p className="mt-4 inline-flex items-center gap-6 text-micro text-mut">
            <span
              aria-hidden="true"
              className="inline-block h-[10px] w-[4px]"
              style={{ background: TASK_TYPE_COLORS[line.taskType] }}
            />
            {TASK_TYPE_LABELS[line.taskType]}
          </p>
          <p className="mt-4 text-dense break-words text-body">{line.text}</p>
        </li>
      ))}
    </ul>
  );
}

function LinesTable({ lines }) {
  return (
    <div className="hidden overflow-x-auto sm:block">
      <table className="w-full min-w-[560px] table-fixed border-collapse text-left">
        <colgroup>
          <col className="w-[28%]" />
          <col className="w-[20%]" />
          <col />
          <col className="w-[64px]" />
        </colgroup>
        <thead>
          <tr className={LABEL}>
            <th className="pr-14 pb-6 font-medium">Task</th>
            <th className="pr-14 pb-6 font-medium">Type</th>
            <th className="pr-14 pb-6 font-medium">What was done</th>
            <th className="pb-6 text-right font-medium">Hours</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line._id} className="border-t border-hair align-top">
              <td className="py-8 pr-14 text-dense">
                <span className="block font-medium text-ink">
                  {line.task?.name ?? "Task"}
                </span>
                {line.task?.project && (
                  <span className="block text-micro text-mut">
                    {line.task.project.name}
                  </span>
                )}
              </td>
              <td className="py-8 pr-14 text-dense whitespace-nowrap text-body">
                <span className="inline-flex items-center gap-6">
                  <span
                    aria-hidden="true"
                    className="inline-block h-[12px] w-[4px]"
                    style={{ background: TASK_TYPE_COLORS[line.taskType] }}
                  />
                  {TASK_TYPE_LABELS[line.taskType]}
                </span>
              </td>
              <td className="py-8 pr-14 text-dense break-words text-body">
                {line.text}
              </td>
              <td className="py-8 text-right font-mono text-dense text-ink tabular-nums">
                {formatHours(line.hours)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// The day's three sections, with no header and no outer padding of their own, so a
// parent that has its own header (This week, Team updates) can sit them under it.
function DayBody({ week, day, canResolve, resolve }) {
  const report = week.report;
  const ownerName = firstNameOf(report.author?.name);
  const target = { kind: "day", reportId: report._id, weekday: day.weekday };
  const hasThreads = day.comments.length > 0;

  return (
    <div className="flex min-w-0 flex-col">
      <div className={SECTION}>
        <StackedLines lines={day.lines} />
        <LinesTable lines={day.lines} />
      </div>

      {day.blockers.length > 0 && (
        <div className={SECTION}>
          <h3 className={cn(LABEL, "mb-4")}>Blockers</h3>
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
        </div>
      )}

      <div
        className={cn(
          SECTION,
          "flex flex-col gap-14",
          !hasThreads && "py-11 print:hidden",
        )}
      >
        {hasThreads && <h3 className={LABEL}>Comments</h3>}
        {day.comments.map((thread) => (
          <CommentThread
            key={thread._id}
            thread={thread}
            target={target}
            canReply={day.canComment}
            ownerName={ownerName}
            variant="conversation"
          />
        ))}
        {day.canComment && (
          <StartThread target={target} ownerName={ownerName} />
        )}
        {!day.canComment && (
          <p className="text-dense text-mut">
            Comments on this update are limited to {ownerName} and managers.
          </p>
        )}
      </div>
    </div>
  );
}

/** One posted day's body — lines, blockers, comments — for a page that has its own header. */
export function PostedUpdate({ week, day }) {
  const { user: me } = useAuth();
  const resolve = useResolveBlocker(week);
  return (
    <DayBody
      week={week}
      day={day}
      canResolve={canResolveBlocker(me, week.report)}
      resolve={resolve}
    />
  );
}

/** The comment count and "Open to team comments" switch, for a header the page draws. */
export function DayControls({ week, day }) {
  const { user: me } = useAuth();
  const toggleTeam = useTeamComments(week);
  return (
    <Controls
      day={day}
      canToggle={canToggleTeamComments(me, week.report)}
      toggleTeam={toggleTeam}
    />
  );
}

// Weekday in Chivo, the date in mono beside it: the card's title.
function DayTitle({ weekday, date, id }) {
  return (
    <h3 id={id} className="flex items-baseline gap-8">
      <span className="font-display text-panel font-bold text-ink">
        {WEEKDAY_LABELS[weekday]}
      </span>
      <span className="font-mono text-micro text-mut">{formatDate(date)}</span>
    </h3>
  );
}

// A day with no update: one calm row, no table, no empty space. Holiday and leave sit on
// --tint with their own label; Missing keeps the 2px --st-corr-fg bar the app uses for
// "needs you"; today and future days are the plainest.
const QUIET = {
  holiday: { text: "Holiday", note: "No update needed." },
  leave: { chip: "on_leave", note: "No update needed." },
  today: { text: "Not posted yet" },
  future: { text: "Not yet" },
  not_on_team: { text: "Not on the team yet" },
};

function QuietDay({ weekday, date, state }) {
  const missing = state === "missing";
  const quiet = QUIET[state] ?? { text: "—" };
  const tinted = state === "holiday" || state === "leave";
  return (
    <div
      className={cn(
        "relative flex break-inside-avoid flex-wrap items-center justify-between gap-x-20 gap-y-4 border border-hair px-20 py-11",
        tinted ? "bg-tint" : "bg-card",
        missing &&
          "before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-st-corr-fg",
      )}
    >
      <DayTitle weekday={weekday} date={date} id={`day-${weekday}`} />
      <p className="flex items-center gap-11 text-dense">
        {quiet.note && <span className="text-mut">{quiet.note}</span>}
        {quiet.chip ? (
          <StatusChip kind="week" value={quiet.chip} />
        ) : missing ? (
          <span className="font-medium text-st-corr-fg">Missing</span>
        ) : (
          <span
            className={cn(
              state === "holiday" ? "font-medium text-ink" : "text-mut",
            )}
          >
            {quiet.text}
          </span>
        )}
      </p>
    </div>
  );
}

function PostedDayCard({
  week,
  day,
  date,
  canResolve,
  canToggle,
  resolve,
  toggleTeam,
}) {
  return (
    <div className="break-inside-avoid border border-hair bg-card">
      <header className="flex flex-wrap items-center justify-between gap-x-20 gap-y-8 border-b border-hair px-20 py-11">
        <div className="flex flex-wrap items-baseline gap-x-14 gap-y-2">
          <DayTitle
            weekday={day.weekday}
            date={date}
            id={`day-${day.weekday}`}
          />
          <span className="font-mono text-dense text-ink">
            {formatHours(day.hours)} h
          </span>
        </div>
        <Controls day={day} canToggle={canToggle} toggleTeam={toggleTeam} />
      </header>
      <DayBody
        week={week}
        day={day}
        canResolve={canResolve}
        resolve={resolve}
      />
    </div>
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
    <section aria-labelledby="daily-updates" className="flex flex-col gap-16">
      <h2
        id="daily-updates"
        className="font-display text-panel font-bold text-ink"
      >
        Daily updates
      </h2>
      <ol className="flex flex-col gap-20">
        {WEEKDAYS.map((weekday, index) => {
          const day = report.days.find((d) => d.weekday === weekday);
          const date = addDays(monday, index);
          const state = week.dayStates[weekday];
          return (
            <li key={weekday}>
              {day ? (
                <PostedDayCard
                  week={week}
                  day={day}
                  date={date}
                  canResolve={canResolve}
                  canToggle={canToggle}
                  resolve={resolve}
                  toggleTeam={toggleTeam}
                />
              ) : (
                <QuietDay weekday={weekday} date={date} state={state} />
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
