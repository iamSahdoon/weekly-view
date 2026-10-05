import { api } from "./apiClient.js";

// Tasks (api_specification.md §2.4). Always the caller's own; tasks are created by a
// day write (R5, `newTask`), never here.

/** T1 → { items: [TaskRef + { doneAt, hoursTotal, lastWeekKey }] } */
export const listTasks = ({ includeDone = false } = {}) =>
  api.get("/tasks", { params: includeDone ? { includeDone: true } : {} });
