import { useState } from "react";
import { PageContainer } from "../components/shell/PageContainer.jsx";
import { PageHeader } from "../components/shell/PageHeader.jsx";
import { Button } from "../components/ui/Button.jsx";
import { ConfirmDialog } from "../components/ui/ConfirmDialog.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { FilterBar } from "../components/ui/FilterBar.jsx";
import { InlineError } from "../components/ui/InlineError.jsx";
import { MultiSelect } from "../components/ui/MultiSelect.jsx";
import { Pagination } from "../components/ui/Pagination.jsx";
import { QueryView } from "../components/ui/QueryView.jsx";
import { EditEmailModal } from "../components/user/EditEmailModal.jsx";
import { InviteModal } from "../components/user/InviteModal.jsx";
import { IssueLinkModal } from "../components/user/IssueLinkModal.jsx";
import { LeaveToggleHost } from "../components/user/LeaveToggleHost.jsx";
import { UsersTable } from "../components/user/UsersTable.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useUrlFilters } from "../hooks/useUrlFilters.js";
import {
  useChangeRole,
  useRemoveUser,
  useTransferOwnership,
  useUsers,
} from "../hooks/useUserQueries.js";
import { ROLE_LABELS, ROLES, USER_STATUSES } from "../lib/constants.js";
import { errorCopy } from "../lib/errorCopy.js";
import { toastError } from "../lib/errorToast.js";
import { firstNameOf } from "../lib/format.js";
import {
  enumParam,
  limitParam,
  listParam,
  pageParam,
  textParam,
} from "../lib/urlParams.js";

// Users — /users, admins only (design §3.10, frontend_architecture.md §9.12). A filter bar
// (search, role, status), the table, pagination, and every user mutation: invite (with the
// link state), the inline role change, edit email, reset link, re-issue, leave, make owner
// and remove. What each row allows is `permissions.userActions`. With no status chosen all
// three statuses are listed, removed people included, so a returning person can be found.

const SPEC = {
  q: textParam(),
  role: listParam(ROLES),
  status: listParam(USER_STATUSES),
  sort: enumParam(["name", "joinedAt"], "name"),
  dir: enumParam(["asc", "desc"], "asc"),
  page: pageParam(),
  limit: limitParam(),
};

const ROLE_OPTIONS = ROLES.map((value) => ({
  value,
  label: ROLE_LABELS[value],
}));
const STATUS_OPTIONS = USER_STATUSES.map((value) => ({
  value,
  label: value[0].toUpperCase() + value.slice(1),
}));
const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "joinedAt", label: "Joined" },
];
const SAVED_MS = 900;

export default function UsersPage() {
  const { user: me } = useAuth();
  const { filters, setFilter, setFilters, clear, activeCount, apiParams } =
    useUrlFilters(SPEC);
  const users = useUsers(apiParams);
  const changeRole = useChangeRole();
  const remove = useRemoveUser();
  const transfer = useTransferOwnership();
  // { kind: "invite" | "email" | "reset" | "reissue" | "remove" | "owner", user? }
  const [dialog, setDialog] = useState(null);
  const [dialogError, setDialogError] = useState(null);
  const [savedId, setSavedId] = useState(null);

  const close = () => {
    setDialog(null);
    setDialogError(null);
  };

  // The Select shows the new role at once (the hook); `Saved` for 900 ms on success, and
  // on failure the hook has put the row back and this raises the toast with Retry.
  const onChangeRole = (user, role) =>
    changeRole.mutate(
      { userId: user._id, role },
      {
        onSuccess: () => {
          setSavedId(user._id);
          setTimeout(
            () => setSavedId((id) => (id === user._id ? null : id)),
            SAVED_MS,
          );
        },
        onError: (error) =>
          toastError("The role wasn’t changed.", error, {
            id: `role-${user._id}`,
            retry: () => onChangeRole(user, role),
          }),
      },
    );

  const confirm = (mutation, userId) =>
    mutation.mutate(userId, {
      onSuccess: close,
      onError: (error) => setDialogError(errorCopy(error)),
    });

  const emptyFiltered = (
    <EmptyState
      variant="filtered"
      title="No people match these filters."
      action={
        <Button variant="secondary" onClick={clear}>
          Clear filters
        </Button>
      }
    />
  );
  const target = dialog?.user;
  const targetFirst = target ? firstNameOf(target.name) || target.email : "";

  return (
    <LeaveToggleHost>
      {({ request: requestLeave }) => (
        <>
          <PageHeader
            title="Users"
            primary={
              <Button
                data-tour="invite-person"
                onClick={() => setDialog({ kind: "invite" })}
              >
                Invite person
              </Button>
            }
          />
          <FilterBar
            search={filters.q}
            onSearch={(q) => setFilter("q", q, { replace: true })}
            searchPlaceholder="Search people"
            activeCount={activeCount}
            onClear={clear}
            sort={{
              options: SORT_OPTIONS,
              value: { id: filters.sort, dir: filters.dir },
              onChange: ({ id, dir }) => setFilters({ sort: id, dir }),
            }}
          >
            <MultiSelect
              label="Role"
              options={ROLE_OPTIONS}
              value={filters.role}
              onChange={(value) => setFilter("role", value)}
            />
            <MultiSelect
              label="Status"
              options={STATUS_OPTIONS}
              value={filters.status}
              onChange={(value) => setFilter("status", value)}
            />
          </FilterBar>
          <PageContainer size="wide">
            <QueryView
              query={users}
              skeleton={
                <UsersTable rows={[]} me={me} isLoading onAction={() => {}} />
              }
              error={
                <InlineError
                  title="The people didn’t load."
                  onRetry={() => users.refetch()}
                >
                  Check your connection and try again.
                </InlineError>
              }
            >
              {(data) => (
                <>
                  <UsersTable
                    rows={data.items}
                    me={me}
                    sort={{ id: filters.sort, dir: filters.dir }}
                    onSortChange={({ id, dir }) =>
                      setFilters({ sort: id, dir })
                    }
                    savedId={savedId}
                    onChangeRole={onChangeRole}
                    onAction={(kind, user) =>
                      kind === "leave"
                        ? requestLeave(user)
                        : setDialog({ kind, user })
                    }
                    isFetching={users.isFetching}
                    emptyState={emptyFiltered}
                  />
                  <Pagination
                    meta={data.meta}
                    onPage={(page) => setFilter("page", page)}
                    onLimit={(limit) => setFilter("limit", limit)}
                  />
                </>
              )}
            </QueryView>
          </PageContainer>

          {dialog?.kind === "invite" && (
            <InviteModal open onOpenChange={(next) => !next && close()} />
          )}
          {dialog?.kind === "email" && (
            <EditEmailModal
              person={target}
              isSelf={target._id === me._id}
              open
              onOpenChange={(next) => !next && close()}
            />
          )}
          {(dialog?.kind === "reset" || dialog?.kind === "reissue") && (
            <IssueLinkModal
              kind={dialog.kind}
              person={target}
              open
              onOpenChange={(next) => !next && close()}
            />
          )}
          {dialog?.kind === "remove" && (
            <ConfirmDialog
              open
              onOpenChange={(next) => !next && close()}
              title={`Remove ${target.name || target.email}?`}
              confirmLabel="Remove"
              onConfirm={() => confirm(remove, target._id)}
              pending={remove.isPending}
            >
              <p>
                Their reports stay in the archive and remain visible to
                managers.
              </p>
              {dialogError && (
                <p role="alert" className="mt-11 text-dense text-st-corr-fg">
                  {dialogError}
                </p>
              )}
            </ConfirmDialog>
          )}
          {dialog?.kind === "owner" && (
            <ConfirmDialog
              open
              onOpenChange={(next) => !next && close()}
              title={`Make ${target.name} the owner?`}
              confirmLabel="Make owner"
              onConfirm={() => confirm(transfer, target._id)}
              pending={transfer.isPending}
            >
              <p>
                {targetFirst} becomes an admin and the protected account. You
                stay an admin but lose the protection. Only {targetFirst} can
                undo this.
              </p>
              {dialogError && (
                <p role="alert" className="mt-11 text-dense text-st-corr-fg">
                  {dialogError}
                </p>
              )}
            </ConfirmDialog>
          )}
        </>
      )}
    </LeaveToggleHost>
  );
}
