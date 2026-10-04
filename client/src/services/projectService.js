import { api } from "./apiClient.js";

// Projects (api_specification.md §2.3). C4 reads them for the day panel and My
// projects; the writes (P2–P5) arrive with the projects page (C8).

/** P1 → { items }. `status` active (default) · inactive · all; `mine`; `usedInWeek`. */
export const listProjects = (params = {}) => api.get("/projects", { params });
