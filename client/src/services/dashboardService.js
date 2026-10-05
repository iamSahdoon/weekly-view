import { api } from "./apiClient.js";

// The team dashboard (api_specification.md §2.9, managers and admins only). One function
// per block; each takes the API params its hook built. `status` goes to D2 alone — it
// must never reach the metric strip (requirements §6). D7, the person profile's strip,
// arrives with that page (C8).

/** D1 → the metric strip: filed, compliance, needs correction, open blockers. */
export const getSummary = (params) => api.get("/dashboard/summary", { params });

/** D2 → paginated team rows, one per person on the team that week. */
export const getTeam = (params) => api.get("/dashboard/team", { params });

/** D3 → { weeks, team, person } — Done tasks per week. */
export const getTrend = (params) => api.get("/dashboard/trend", { params });

/** D4 → { items: [{ type, hours }], total } — time by task type. */
export const getHours = (params) => api.get("/dashboard/hours", { params });

/** D5 → { items: [{ project, hours, totalHours }] } — workload by project. */
export const getWorkload = (params) =>
  api.get("/dashboard/workload", { params });

/** D6 → { items } — the latest eight events, not week-scoped. */
export const getActivity = () => api.get("/dashboard/activity");

/** D8 → { items } — every active project with a plan. */
export const getProjects = (params) =>
  api.get("/dashboard/projects", { params });
