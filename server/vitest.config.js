import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./tests/helpers/globalSetup.js"],
    setupFiles: ["./tests/helpers/testDb.js"],
    // config/env.js parses these at import. MONGODB_URI is a placeholder that nothing
    // connects to: testDb.js connects Mongoose to an in-memory replica set, so tests
    // never touch Atlas even when a real URI is set in the shell.
    env: {
      NODE_ENV: "test",
      MONGODB_URI: "mongodb://in-memory.invalid/weeklyview-test",
      JWT_SECRET: "test-only-secret-that-is-at-least-32-characters-long",
      JWT_EXPIRES_IN: "5d",
      CLIENT_URL: "http://localhost:5173",
    },
    // The first run downloads mongod (fastdl.mongodb.org).
    hookTimeout: 180_000,
    testTimeout: 20_000,
  },
});
