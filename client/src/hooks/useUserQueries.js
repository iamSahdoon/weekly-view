import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { qk } from "../lib/queryKeys.js";
import * as userService from "../services/userService.js";
import { useAuth } from "./useAuth.js";

// User hooks (frontend_architecture.md §5.6). C4 needs the leave line on This week, C6
// the list behind its person filters; the people and users pages bring the rest (C8).

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
