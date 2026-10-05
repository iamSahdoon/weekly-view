import { api } from "./apiClient.js";

// Reports and days (api_specification.md §2.5). C3 holds the reads and the two
// switches a reader can flip; C4 the day write and the This week lists (R1, R2, R5);
// C5 the end-of-week content and submit (R6, R7); C6 the team feed (R12).

/** R1 → paginated ReportRow items, the caller's own. */
export const listMyReports = (params) => api.get("/reports", { params });

/** R2 → { weeksFiled, hoursThisMonth, openBlockers } */
export const getSummary = ({ weekKey, month }) =>
  api.get("/reports/summary", { params: { weekKey, month } });

/** R3 → WeekView, the caller's own week. */
export const getMyWeek = (weekKey) => api.get(`/reports/week/${weekKey}`);

/** R5 → WeekView. The whole day: lines, blockers, openToTeam. */
export const putDay = (weekKey, weekday, body) =>
  api.put(`/reports/week/${weekKey}/days/${weekday}`, body);

/** R6 → WeekView. The whole content body, from toContentPayload. */
export const saveContent = (id, body) => api.patch(`/reports/${id}`, body);

/** R7 → WeekView. Submit, or resubmit after a send-back. */
export const submitReport = (id, { requestApproval }) =>
  api.post(`/reports/${id}/submit`, { requestApproval });

/** R4 → WeekView */
export const getReport = (id) => api.get(`/reports/${id}`);

/** R8 → { items: RevisionSummary[] }, newest first. */
export const listRevisions = (id) => api.get(`/reports/${id}/revisions`);

/** R9 → Revision */
export const getRevision = (id, revisionNumber) =>
  api.get(`/reports/${id}/revisions/${revisionNumber}`);

/** R10 → { blockerId, resolvedAt, resolvedBy } */
export const setResolution = (id, blockerId) =>
  api.put(`/reports/${id}/blockers/${blockerId}/resolution`);

/** R10, undone → the same shape, with nulls. */
export const clearResolution = (id, blockerId) =>
  api.delete(`/reports/${id}/blockers/${blockerId}/resolution`);

/** R11 → Day */
export const setTeamComments = (id, weekday, open) =>
  api.put(`/reports/${id}/days/${weekday}/team-comments`, { open });

/** R12 → { items: [{ user, state, reportId, day }] }, sorted by name, the viewer first. */
export const listTeamUpdates = ({ weekKey, weekday, project, blockersOnly }) =>
  api.get("/updates", {
    params: { weekKey, weekday, project, blockersOnly },
  });

/** R13 → null. Silent: nothing shows when it fails. */
export const markSeen = (id) => api.post(`/reports/${id}/seen`);
