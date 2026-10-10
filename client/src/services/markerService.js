import { api } from "./apiClient.js";

// "New" markers (api_specification.md §2.10). Only the sidebar's dots come from here;
// every other marker is the `isNew` field on rows, days and threads a page already loads.

/** N1 → `{ reviewRequests, nav: { thisWeek, myReports } }` */
export const getNewMarks = () => api.get("/me/new");
