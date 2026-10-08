import { api } from "./apiClient.js";

// Projects (api_specification.md §2.3), reads and writes.

/** P1 → { items }. `status` active (default) · inactive · all; `mine`; `usedInWeek`. */
export const listProjects = (params = {}) => api.get("/projects", { params });

/** P2 → a P1 manager item. `plan` is { startDate, plannedDays, plannedHours } or omitted. */
export const createProject = (body) => api.post("/projects", body);

/** P3 → a P1 manager item. Any of { name, description, memberIds }. */
export const updateProject = (id, body) => api.patch(`/projects/${id}`, body);

/** P4 → a P1 manager item; the plan being replaced goes into planHistory. */
export const setPlan = (id, plan) => api.put(`/projects/${id}/plan`, plan);

/** P5 → a P1 manager item. Idempotent. */
export const deactivateProject = (id) => api.post(`/projects/${id}/deactivate`);
