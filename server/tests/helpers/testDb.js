import { afterAll, beforeAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Holiday } from "../../src/models/holidayModel.js";
import { Project } from "../../src/models/projectModel.js";
import { Report } from "../../src/models/reportModel.js";
import { Revision } from "../../src/models/revisionModel.js";
import { SeenMark } from "../../src/models/seenMarkModel.js";
import { Task } from "../../src/models/taskModel.js";
import { User } from "../../src/models/userModel.js";

// One in-memory replica set per test file — replica-set mode because the ownership
// transfer and submit need transactions. Indexes are built before any test runs.

export const models = [
  User,
  Project,
  Task,
  Report,
  Revision,
  Holiday,
  SeenMark,
];

let replSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  // A short heartbeat keeps the clock-freeze regression test (testDb.test.js) quick.
  await mongoose.connect(replSet.getUri(), {
    dbName: "weeklyview-test",
    heartbeatFrequencyMS: 500,
  });
  // Tests freeze `Date` (vi.useFakeTimers). The driver stamps each heartbeat with that
  // fake clock, but Mongoose's `readyState` compares the stamp with the real one and,
  // seeing it days old, reports "disconnected": the next syncIndexes() buffers until
  // "Connection operation buffering timed out after 10000ms". Never keep the stamp.
  Object.defineProperty(mongoose.connection, "_lastHeartbeatAt", {
    get: () => null,
    set: () => {},
  });
  await Promise.all(models.map((model) => model.syncIndexes()));
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet?.stop();
});

/** Empties every collection, keeping its indexes. */
export async function clearDb() {
  await Promise.all(models.map((model) => model.deleteMany({})));
}
