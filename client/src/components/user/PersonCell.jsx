import { cn } from "../../lib/cn.js";
import { Avatar } from "../ui/Avatar.jsx";
import { RoleChip } from "../ui/RoleChip.jsx";
import { StatusChip } from "../ui/StatusChip.jsx";

// A person in a list (design §3.10, §3.15): avatar, name over email, and the chips that
// belong beside the name — `Owner`, `On leave` (leave is not an account status), the
// removed marker (the name stays, never struck through). An invited person has no name
// until they accept, so the email takes its place and the avatar shows its first letter.

export function PersonCell({ person, avatar = 28, showRole = false }) {
  const label = person.name || person.email;
  return (
    <span className="inline-flex min-w-0 items-center gap-11">
      <Avatar name={label} size={avatar} />
      <span className="flex min-w-0 flex-col">
        <span className="inline-flex min-w-0 flex-wrap items-center gap-x-8 gap-y-2">
          <span className="truncate text-dense font-medium text-ink">
            {label}
          </span>
          {person.isOwner && (
            <span className="border border-hair bg-tint px-6 py-2 text-micro leading-none font-medium whitespace-nowrap text-mut">
              Owner
            </span>
          )}
          {showRole && <RoleChip role={person.role} />}
          {person.onLeave && person.status === "active" && (
            <StatusChip kind="week" value="on_leave" size="sm" />
          )}
          {person.status === "removed" && (
            <StatusChip kind="user" value="removed" size="sm" />
          )}
        </span>
        {person.name && (
          <span className={cn("truncate text-caption text-mut")}>
            {person.email}
          </span>
        )}
      </span>
    </span>
  );
}
