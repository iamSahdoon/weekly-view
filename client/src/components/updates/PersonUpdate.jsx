import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { formatHours } from "../../lib/format.js";
import { DayControls, PostedUpdate } from "../report/DailyUpdatesBlock.jsx";
import { Avatar } from "../ui/Avatar.jsx";
import { RoleChip } from "../ui/RoleChip.jsx";
import { StatusChip } from "../ui/StatusChip.jsx";

// One person's day on Team updates (design §3.16), or their one-line state: "Not
// posted yet", the `On leave` chip, a holiday. A posted day is the shared day block —
// lines, blockers, thread, the team-comments switch — under a header. The name links to
// their week; yours to your own page. It owns no mutation of its own: `PostedUpdate`
// brings the blocker, switch and comment actions, which act on a minimal week built from
// the feed entry (the feed carries the person and the report's id, not the whole week).

const STATE_LINES = {
  not_posted: "Not posted yet",
  holiday: "Holiday",
};

function Heading({ user, weekKey, meta }) {
  const { user: me } = useAuth();
  const to =
    user._id === me._id
      ? `/reports/${weekKey}`
      : `/people/${user._id}/reports/${weekKey}`;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-11 gap-y-4">
      <Avatar name={user.name} size={28} />
      <Link
        to={to}
        className="text-base font-medium text-ink underline-offset-2 hover:underline"
      >
        {user.name}
      </Link>
      <RoleChip role={user.role} />
      {meta}
    </div>
  );
}

const projectNames = (day) => [
  ...new Set(day.lines.map((l) => l.task?.project?.name).filter(Boolean)),
];

export function PersonUpdate({ entry, weekKey }) {
  const { user, state, day, reportId } = entry;

  if (state !== "posted") {
    return (
      <li className="flex min-h-[var(--row-h)] items-center justify-between gap-11 border border-hair bg-card px-20 py-8">
        <Heading user={user} weekKey={weekKey} />
        {state === "leave" ? (
          <StatusChip kind="week" value="on_leave" />
        ) : (
          <span className="text-dense text-mut">{STATE_LINES[state]}</span>
        )}
      </li>
    );
  }

  const week = { user, weekKey, report: { _id: reportId, author: user } };
  const projects = projectNames(day);
  return (
    <li className="border border-hair bg-card">
      <div className="px-20 py-14">
        <Heading
          user={user}
          weekKey={weekKey}
          meta={
            <span className="font-mono text-caption text-mut">
              {formatHours(day.hours)} h
              {projects.length > 0 && ` · ${projects.join(", ")}`}
            </span>
          }
        />
      </div>
      <div className="border-y border-hair px-20 py-8">
        <DayControls week={week} day={day} />
      </div>
      <PostedUpdate week={week} day={day} />
    </li>
  );
}
