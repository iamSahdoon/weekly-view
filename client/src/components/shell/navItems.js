import {
  BarChart3,
  Calendar,
  CalendarDays,
  FileText,
  FolderKanban,
  Inbox,
  UserCog,
  UserRound,
  Users,
} from "lucide-react";

// The sidebar as data (frontend_architecture.md §7.2; design §1.3–§1.4): one place
// that says what exists, for whom, and which routes keep an item lit.
//   match  route patterns that keep the item active (a profile's week highlights
//          People; a review page highlights Review desk). Default: its own `to`.
//   dot    a key of N1's `nav`   — the 6×6 "new" square (C9 wires it)
//   count  a key of V4            — shown only above zero (C6 wires it)

const EVERYONE = ["member", "manager", "admin"];
const MANAGERS = ["manager", "admin"];

export const NAV_GROUPS = [
  {
    id: "work",
    label: "My work",
    roles: EVERYONE,
    items: [
      {
        to: "/",
        label: "This week",
        icon: Calendar,
        match: ["/", "/reports/:week/edit"],
        dot: "thisWeek",
      },
      {
        to: "/reports",
        label: "My reports",
        icon: FileText,
        match: ["/reports", "/reports/:week"],
        dot: "myReports",
      },
      { to: "/updates", label: "Team updates", icon: Users },
    ],
  },
  {
    id: "review",
    label: "Review",
    roles: MANAGERS,
    items: [
      {
        to: "/review",
        label: "Review desk",
        icon: Inbox,
        match: ["/review", "/review/:reportId"],
        count: "reviewDesk",
      },
      { to: "/team", label: "Team dashboard", icon: BarChart3 },
    ],
  },
  {
    id: "team",
    label: "Team",
    roles: MANAGERS,
    items: [
      {
        to: "/people",
        label: "People",
        icon: UserRound,
        match: ["/people", "/people/:userId", "/people/:userId/reports/:week"],
      },
      { to: "/projects", label: "Projects", icon: FolderKanban },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    roles: ["admin"],
    items: [
      { to: "/users", label: "Users", icon: UserCog },
      { to: "/holidays", label: "Holidays", icon: CalendarDays },
    ],
  },
];

/**
 * The groups a role may see, in the role's order. A forbidden group is not
 * returned at all — it is never in the DOM (design §13). *My work* is first for
 * members and last for managers and admins (design §1.4).
 */
export function groupsForRole(role) {
  const visible = NAV_GROUPS.filter((group) => group.roles.includes(role));
  if (role === "member" || visible.length === 0) return visible;
  const [work, ...rest] = visible;
  return [...rest, work];
}
