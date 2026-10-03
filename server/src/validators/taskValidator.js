import { z } from "zod";
import { booleanQuery } from "./projectValidator.js";

// T1 — api_specification.md §2.4.

export const listTasksSchema = z.object({
  query: z.object({ includeDone: booleanQuery.default(false) }),
});
