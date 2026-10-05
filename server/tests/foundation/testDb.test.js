import { afterEach, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { User } from "../../src/models/userModel.js";

// Several suites freeze `Date` at a week of their own. The connection must stay usable
// while the clock is frozen before today and a driver heartbeat lands in that time —
// seed.test.js used to fail intermittently with "Connection operation buffering timed
// out" because it did not (see testDb.js).

afterEach(() => {
  vi.useRealTimers();
});

it("keeps the connection ready while the clock is frozen in the past", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2020-01-06T12:00:00.000Z"));
  await new Promise((resolve) => setTimeout(resolve, 1500)); // a few heartbeats
  expect(mongoose.connection.readyState).toBe(1);
  await expect(User.syncIndexes()).resolves.toBeDefined();
});
