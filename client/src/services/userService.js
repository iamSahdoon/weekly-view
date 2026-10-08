import { api } from "./apiClient.js";

// Users (api_specification.md §2.2): one function per endpoint. The links in U3, U4 and
// U13 come back in that response only — callers hold them in component state.

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

/** U2 → a U1 item plus `leaveHistory` (managers and admins). */
export const getUser = (userId) => api.get(`/users/${userId}`);

/** U7 → paginated ReportRow / WeekRow, every week the person was on the team. */
export const listUserReports = (userId, params) =>
  api.get(`/users/${userId}/reports`, { params });

/** U3 → { user, linkUrl, expiresAt }. */
export const inviteUser = ({ email, role, projects }) =>
  api.post(
    "/users",
    projects?.length ? { email, role, projects } : { email, role },
  );

/** U4 → { linkUrl, expiresAt }. */
export const reissueInvite = (userId) =>
  api.post(`/users/${userId}/invite-link`);

/** U5 → a U1 item. */
export const changeRole = (userId, role) =>
  api.patch(`/users/${userId}/role`, { role });

/** U6 → a U1 item. */
export const removeUser = (userId) => api.post(`/users/${userId}/remove`);

/** U11 → the new owner as a U1 item. */
export const transferOwnership = (userId) =>
  api.post(`/users/${userId}/transfer-ownership`);

/** U12 → a U1 item. */
export const changeEmail = (userId, email) =>
  api.patch(`/users/${userId}/email`, { email });

/** U13 → { linkUrl, expiresAt }. */
export const createResetLink = (userId) =>
  api.post(`/users/${userId}/reset-link`);
