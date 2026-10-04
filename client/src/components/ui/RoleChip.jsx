import { cn } from "../../lib/cn.js";

// Design §1.3 / §6.23: shown for managers and admins beside a name; a plain member
// carries none. Not a status — a quiet label on --tint.

const SHORT = { member: "Member", manager: "Manager", admin: "Admin" };

export function RoleChip({ role, className }) {
  if (!SHORT[role] || role === "member") return null;
  return (
    <span
      className={cn(
        "inline-block border border-hair bg-tint px-6 py-2 text-micro leading-none font-medium whitespace-nowrap text-mut",
        className,
      )}
    >
      {SHORT[role]}
    </span>
  );
}
