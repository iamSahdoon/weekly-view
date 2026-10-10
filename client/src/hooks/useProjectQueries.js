import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "../lib/queryKeys.js";
import * as projectService from "../services/projectService.js";

// Project hooks (frontend_architecture.md §5.6, §5.7). Every write marks stale what a
// project feeds: its lists, the weeks that name it, the team's day and the dashboard.

/** P1. `opts` are API params: `status`, `mine`, `usedInWeek`. */
export function useProjects(opts = {}, { enabled = true } = {}) {
  return useQuery({
    queryKey: qk.projects(opts),
    queryFn: () => projectService.listProjects(opts),
    enabled,
  });
}

function useProjectWrite(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      for (const key of [
        qk.all.projects(),
        qk.all.week(),
        qk.all.teamUpdates(),
        qk.all.dashboard(),
      ]) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

/** P2. */
export const useCreateProject = () =>
  useProjectWrite((body) => projectService.createProject(body));

/** P3 — `{ id, body }`. */
export const useUpdateProject = () =>
  useProjectWrite(({ id, body }) => projectService.updateProject(id, body));

/** P4 — `{ id, plan }`. */
export const useSetPlan = () =>
  useProjectWrite(({ id, plan }) => projectService.setPlan(id, plan));

/** P5 — the project id. */
export const useDeactivateProject = () =>
  useProjectWrite((id) => projectService.deactivateProject(id));
