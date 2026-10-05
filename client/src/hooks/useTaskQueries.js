import { useQuery } from "@tanstack/react-query";
import { qk } from "../lib/queryKeys.js";
import * as taskService from "../services/taskService.js";

// Task hooks (frontend_architecture.md §5.6). Tasks are created by a day write, so
// there is no mutation here.

/** T1 — the caller's open tasks, for the day panel's picker. */
export function useMyTasks({ includeDone = false, enabled = true } = {}) {
  return useQuery({
    queryKey: qk.tasks({ includeDone }),
    queryFn: () => taskService.listTasks({ includeDone }),
    enabled,
  });
}
