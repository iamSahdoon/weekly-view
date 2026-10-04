import { api } from "./apiClient.js";

// Comments (api_specification.md §2.6). The review actions and the desk (V1–V4)
// arrive with C6. One path shape serves day and week threads: thread ids are unique
// within a report.

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
