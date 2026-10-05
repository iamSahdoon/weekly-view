import { api } from "./apiClient.js";

// Review and comments (api_specification.md §2.6, §2.7). V1–V3 are here; the desk's
// count (V4) arrives with the sidebar's marker in C9. One path shape serves day and
// week threads: thread ids are unique within a report.

/** V1 → WeekView. `comment` is optional; `revisionNumber` is the version that was read. */
export const approve = (id, { revisionNumber, comment }) =>
  api.post(`/reports/${id}/review/approve`, {
    revisionNumber,
    ...(comment ? { comment } : {}),
  });

/** V2 → WeekView. `comment` is required, 10 to 2000 characters. */
export const sendBack = (id, { revisionNumber, comment }) =>
  api.post(`/reports/${id}/review/send-back`, { revisionNumber, comment });

/** V3 → paginated review-desk items, never the caller's own. */
export const listReviewDesk = (params) => api.get("/review-desk", { params });

/** C1 → Day (201) */
export const commentOnDay = (reportId, weekday, text) =>
  api.post(`/reports/${reportId}/days/${weekday}/comments`, { text });

/** C2 → { weekComments } (201) */
export const commentOnWeek = (reportId, text) =>
  api.post(`/reports/${reportId}/week-comments`, { text });

/** C3 → Thread (201) */
export const reply = (reportId, threadId, text) =>
  api.post(`/reports/${reportId}/threads/${threadId}/replies`, { text });

/** C4 → Thread */
export const editComment = (reportId, threadId, text) =>
  api.patch(`/reports/${reportId}/threads/${threadId}`, { text });

/** C4 → Thread */
export const editReply = (reportId, threadId, replyId, text) =>
  api.patch(`/reports/${reportId}/threads/${threadId}/replies/${replyId}`, {
    text,
  });

/** C5 → the containing Day, or { weekComments } */
export const deleteComment = (reportId, threadId) =>
  api.delete(`/reports/${reportId}/threads/${threadId}`);

/** C5 → the containing Day, or { weekComments } */
export const deleteReply = (reportId, threadId, replyId) =>
  api.delete(`/reports/${reportId}/threads/${threadId}/replies/${replyId}`);
