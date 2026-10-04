import { api } from "./apiClient.js";

// Reports and days (api_specification.md §2.5). C3 holds the reads and the two
// switches a reader can flip; the writer's calls (R5–R7) arrive with C4 and C5.

/** R3 → WeekView, the caller's own week. */
export const getMyWeek = (weekKey) => api.get(`/reports/week/${weekKey}`);

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

/** R13 → null. Silent: nothing shows when it fails. */
export const markSeen = (id) => api.post(`/reports/${id}/seen`);
