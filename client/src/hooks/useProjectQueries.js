import { useQuery } from "@tanstack/react-query";
import { qk } from "../lib/queryKeys.js";
import * as projectService from "../services/projectService.js";

// Project hooks (frontend_architecture.md §5.6). The writes arrive with the projects
// page (C8).

/** P1. `opts` are API params: `status`, `mine`, `usedInWeek`. */
export function useProjects(opts = {}, { enabled = true } = {}) {
  return useQuery({
    queryKey: qk.projects(opts),
    queryFn: () => projectService.listProjects(opts),
    enabled,
  });
}
