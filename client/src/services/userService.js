import { api } from "./apiClient.js";

// Users (api_specification.md §2.2). C3 needs only U8; the rest arrive with the
// people, users and profile pages (C6, C8).

/** U8 → WeekView, anyone's week. */
export const getUserWeek = (userId, weekKey) =>
  api.get(`/users/${userId}/reports/${weekKey}`);
