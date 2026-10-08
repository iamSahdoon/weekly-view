import { ROLE_LABELS, ROLES } from "../../lib/constants.js";
import { formatDate, formatDateLong } from "../../lib/format.js";
import { userActions } from "../../lib/permissions.js";
import { DropdownMenu } from "../ui/DropdownMenu.jsx";
import { Select } from "../ui/Select.jsx";
import { StatusChip } from "../ui/StatusChip.jsx";
import { Table } from "../ui/Table.jsx";
import { Tooltip } from "../ui/Tooltip.jsx";
import { PersonCell } from "./PersonCell.jsx";

// The Users table (design §3.10, admins only): person · role (an inline Select that writes
// at once and says `Saved` for 900 ms) · projects · status chip · joined, or the invite's
// expiry · a row menu. What a row's controls allow is `permissions.userActions` — the one
// place the admin / owner rules live on the client; a control the viewer may not use is
// disabled and says why (a disabled Select carries it as a tooltip and as text for a
// screen reader; a menu item prints it beneath).

const projectsOf = (user) =>
  user.projects.length ? user.projects.map((p) => p.name).join(", ") : "—";

function JoinedCell({ user }) {
  if (user.status === "invited") {
    const expired =
      user.linkExpiresAt && new Date(user.linkExpiresAt) < new Date();
    return expired ? (
      <span className="text-st-corr-fg">Invite expired</span>
    ) : (
      <span>
        Invited
        {user.linkExpiresAt
          ? ` · expires ${formatDate(user.linkExpiresAt)}`
          : ""}
      </span>
    );
  }
  return user.joinedAt ? formatDateLong(user.joinedAt) : "—";
}

function RoleCell({ user, me, saved, onChangeRole }) {
  const gate = userActions(me, user).canChangeRole;
  const select = (
    <Select
      size="sm"
      aria-label={`Role of ${user.name || user.email}`}
      className="w-[132px]"
      value={user.role}
      disabled={!gate.allowed}
      options={ROLES.map((role) => ({
        value: role,
        label: ROLE_LABELS[role],
        disabled: role === "admin" && !me.isOwner,
      }))}
      onChange={(event) => onChangeRole(user, event.target.value)}
    />
  );
  return (
    <span className="inline-flex items-center gap-8">
      {gate.allowed ? (
        select
      ) : (
        <Tooltip content={gate.reason}>
          <span
            tabIndex={0}
            className="pointer-events-auto *:pointer-events-none"
          >
            {select}
          </span>
        </Tooltip>
      )}
      {!gate.allowed && <span className="sr-only">{gate.reason}</span>}
      {saved && (
        <span role="status" className="text-micro text-mut">
          Saved
        </span>
      )}
    </span>
  );
}

function menuItems(user, me, on) {
  const a = userActions(me, user);
  const item = (label, gate, kind, extra = {}) => ({
    label,
    disabled: !gate.allowed,
    reason: gate.reason,
    onSelect: () => on(kind, user),
    ...extra,
  });
  const items = [
    item("Edit email", a.canEditEmail, "email"),
    item("Password reset link", a.canResetPassword, "reset"),
    item(
      user.onLeave ? "End leave" : "Mark as on leave",
      a.canToggleLeave,
      "leave",
    ),
  ];
  if (user.status === "invited") {
    items.push(item("Re-issue invite", a.canReissue, "reissue"));
  }
  // `Make owner` is the owner's alone and only for an eligible row (design §3.10).
  if (me.isOwner && a.canMakeOwner.allowed) {
    items.push(item("Make owner", a.canMakeOwner, "owner"));
  }
  items.push(
    item("Remove", a.canRemove, "remove", {
      destructive: true,
      separatorBefore: true,
    }),
  );
  return items;
}

export function UsersTable({
  rows,
  me,
  sort,
  onSortChange,
  savedId,
  onChangeRole,
  onAction,
  isFetching,
  isLoading,
  emptyState,
}) {
  const columns = [
    {
      id: "name",
      header: "Person",
      sortable: true,
      cell: (user) => <PersonCell person={user} />,
    },
    {
      id: "role",
      header: "Role",
      width: 190,
      cell: (user) =>
        user.status === "removed" ? (
          ROLE_LABELS[user.role]
        ) : (
          <RoleCell
            user={user}
            me={me}
            saved={savedId === user._id}
            onChangeRole={onChangeRole}
          />
        ),
    },
    {
      id: "projects",
      header: "Projects",
      mobile: "hidden",
      cell: (user) => (
        <span
          className="block max-w-[260px] truncate text-body"
          title={projectsOf(user)}
        >
          {projectsOf(user)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      width: 110,
      mobile: "status",
      cell: (user) => <StatusChip kind="user" value={user.status} />,
    },
    {
      id: "joinedAt",
      header: "Joined",
      width: 190,
      sortable: true,
      mono: true,
      label: "Joined",
      cell: (user) => <JoinedCell user={user} />,
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      width: 56,
      cell: (user) =>
        user.status === "removed" ? null : (
          <DropdownMenu
            label={`Actions for ${user.name || user.email}`}
            items={menuItems(user, me, onAction)}
          />
        ),
    },
  ];
  return (
    <Table
      columns={columns}
      rows={rows}
      sort={sort}
      onSortChange={onSortChange}
      isFetching={isFetching}
      isLoading={isLoading}
      emptyState={emptyState}
      keepHeader
      caption="Users"
    />
  );
}
