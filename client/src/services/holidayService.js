import { api } from "./apiClient.js";

// Holidays (api_specification.md §2.8), reads and writes.

/** HD1 → { items: [{ _id, date, name, createdBy }] }, by date. */
export const listHolidays = ({ from, to }) =>
  api.get("/holidays", { params: { from, to } });

/** HD2 → the holiday. */
export const createHoliday = ({ date, name }) =>
  api.post("/holidays", { date, name });

/** HD3 → the holiday. */
export const updateHoliday = (id, body) => api.patch(`/holidays/${id}`, body);

/** HD4 → the holiday that was removed (deleted for real). */
export const deleteHoliday = (id) => api.delete(`/holidays/${id}`);
