import { cn } from "../../lib/cn.js";
import { Avatar } from "./Avatar.jsx";

// Design §6.18: overlapping 22px initials, up to `max` and then `+N`. The names are in
// the title for a hover and in the text beside it, never the only carrier (§6.13).

export function AvatarStack({ people, max = 4, className }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <span
      className={cn("inline-flex items-center", className)}
      title={people.map((p) => p.name).join(", ")}
    >
      {shown.map((person, i) => (
        <Avatar
          key={person._id ?? person.name}
          name={person.name}
          size={22}
          className={cn("bg-card", i > 0 && "-ml-6")}
        />
      ))}
      {extra > 0 && (
        <span className="ml-6 font-mono text-micro text-mut">+{extra}</span>
      )}
    </span>
  );
}
