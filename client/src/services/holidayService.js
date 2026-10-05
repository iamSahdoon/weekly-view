import { api } from "./apiClient.js";

// Holidays (api_specification.md §2.8). C4 reads them for the week's strip; the
// writes (HD2–HD4) arrive with the holidays page (C8).

/** HD1 → { items: [{ _id, date, name, createdBy }] }, by date. */
export const listHolidays = ({ from, to }) =>
  api.get("/holidays", { params: { from, to } });
