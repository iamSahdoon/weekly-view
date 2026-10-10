import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { qk } from "../lib/queryKeys.js";
import * as authService from "../services/authService.js";
import * as userService from "../services/userService.js";
import { useAuth } from "./useAuth.js";

// User hooks (frontend_architecture.md §5.6, §5.7). The three link mutations return a raw
// link: `gcTime: 0`, and the modal that fired one calls `reset()` when it closes, so a
// link is never in the cache after that (rule 7). The `users` list never holds one.

/** U1 — `filters` are API params. Managers and admins only: pass `enabled`. */
export function useUsers(filters, { enabled = true } = {}) {
  return useQuery({
    queryKey: qk.users(filters),
    queryFn: () => userService.listUsers(filters),
    enabled,
    placeholderData: keepPreviousData,
  });
}

/** U10 — who is on leave now. Enabled for the current week only (FA8). */
export function useOnLeave({ enabled = true } = {}) {
  return useQuery({
    queryKey: qk.onLeave(),
    queryFn: userService.listOnLeave,
    enabled,
  });
}

/** U9 — open or close a leave period. The actor's own `Me` refreshes from the response. */
export function useSetLeave() {
  const queryClient = useQueryClient();
  const { user: me, setUser } = useAuth();
  return useMutation({
    mutationFn: ({ userId, onLeave }) => userService.setLeave(userId, onLeave),
    onSuccess: (data, { userId }) => {
      if (userId === me._id) setUser(data);
      for (const key of [
        qk.all.users(),
        qk.onLeave(),
        qk.all.week(),
        qk.all.teamUpdates(),
        qk.all.dashboard(),
      ]) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

/** U2 — the profile header, with the leave history. */
export function useUser(userId) {
  return useQuery({
    queryKey: qk.user(userId),
    queryFn: () => userService.getUser(userId),
  });
}

/** Marks what a user change touches stale: the lists, and the dashboard that counts people. */
function invalidateUsers(queryClient) {
  for (const key of [qk.all.users(), qk.all.dashboard()]) {
    queryClient.invalidateQueries({ queryKey: key });
  }
}

/** U3 → { user, linkUrl, expiresAt }. */
export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userService.inviteUser,
    gcTime: 0,
    onSuccess: () => invalidateUsers(queryClient),
  });
}

/** U4 → { linkUrl, expiresAt }. */
export function useReissueInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId) => userService.reissueInvite(userId),
    gcTime: 0,
    onSuccess: () => invalidateUsers(queryClient),
  });
}

/** U13 → { linkUrl, expiresAt }. */
export function useCreateResetLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId) => userService.createResetLink(userId),
    gcTime: 0,
    onSuccess: () => invalidateUsers(queryClient),
  });
}

/**
 * U5 — the Select shows the new role at once (optimistic, one field); on an error the
 * row is put back and the caller raises the toast. The write goes through the list
 * caches it can reach, so every open view of the row changes together.
 */
export function useChangeRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }) => userService.changeRole(userId, role),
    onMutate: async ({ userId, role }) => {
      await queryClient.cancelQueries({ queryKey: qk.all.users() });
      const snapshots = queryClient.getQueriesData({
        queryKey: qk.all.users(),
      });
      queryClient.setQueriesData({ queryKey: qk.all.users() }, (data) =>
        data?.items
          ? {
              ...data,
              items: data.items.map((u) =>
                u._id === userId ? { ...u, role } : u,
              ),
            }
          : data,
      );
      return { snapshots };
    },
    onError: (error, variables, context) => {
      for (const [key, data] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, data);
      }
    },
    onSettled: () => invalidateUsers(queryClient),
  });
}

/** U6. */
export function useRemoveUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId) => userService.removeUser(userId),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

/** U12. */
export function useChangeEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, email }) => userService.changeEmail(userId, email),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

/**
 * U11 — afterwards the actor is no longer the owner, so their `Me` is read again
 * (§5.7) and every list that shows an `Owner` chip is stale.
 */
export function useTransferOwnership() {
  const queryClient = useQueryClient();
  const { setUser } = useAuth();
  return useMutation({
    mutationFn: (userId) => userService.transferOwnership(userId),
    onSuccess: async () => {
      invalidateUsers(queryClient);
      setUser(await authService.getMe());
    },
  });
}

/** A5 — the name; the response is the new `Me`. */
export function useUpdateMe() {
  const { setUser } = useAuth();
  return useMutation({
    mutationFn: authService.updateMe,
    onSuccess: (user) => setUser(user),
  });
}

/** A6 — the new token replaces the old, so this session carries on (§5.7). */
export function useChangePassword() {
  const { signIn } = useAuth();
  return useMutation({
    mutationFn: authService.changePassword,
    gcTime: 0,
    onSuccess: ({ token, user }) => signIn(token, user),
  });
}
