import { buildFixtures } from "./fixtures.js";

// The in-memory store (tech_stack.md §6.9). Handlers read and mutate it; a
// refresh or Start over rebuilds it from the fixtures — the whole reset mechanism.
export function createDemoStore(now = new Date()) {
  return {
    session: { userId: null },
    ...buildFixtures(now),
  };
}
