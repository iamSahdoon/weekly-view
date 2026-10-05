import { api } from "./apiClient.js";

// Users (api_specification.md §2.2). C3 needs U8, C4 the leave line (U9, U10), C6 the
// list for its person filters (U1); the rest arrive with the people, users and profile
// pages (C8).

/** U1 → paginated users (managers and admins only). */
export const listUsers = (params) => api.get("/users", { params });

/** U8 → WeekView, anyone's week. */
export const getUserWeek = (userId, weekKey) =>
  api.get(`/users/${userId}/reports/${weekKey}`);

/** U9 → Me when the actor is the target, else a U1 item. */
export const setLeave = (userId, onLeave) =>
  api.put(`/users/${userId}/leave`, { onLeave });

/** U10 → { items: UserRef[] }, active people on leave now. */
export const listOnLeave = () => api.get("/users/on-leave");
