import { buildFixtures } from "./fixtures.js";

// The in-memory store (tech_stack.md §6.9). Handlers read and mutate it; a
// refresh or Start over rebuilds it from the fixtures — the whole reset mechanism.
export function createDemoStore(now = new Date()) {
  // Ids for what the handlers create: 24 hex digits, past anything in the fixtures.
  let counter = 1000;
  return {
    session: { userId: null },
    nextId: (kind) => `${kind}${String(++counter).padStart(22, "0")}`,
    ...buildFixtures(now),
  };
}
