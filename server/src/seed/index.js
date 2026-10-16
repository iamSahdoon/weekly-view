import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";
import mongoose from "mongoose";
import { Holiday } from "../models/holidayModel.js";
import { Project } from "../models/projectModel.js";
import { Report } from "../models/reportModel.js";
import { Revision } from "../models/revisionModel.js";
import { SeenMark } from "../models/seenMarkModel.js";
import { Task } from "../models/taskModel.js";
import { User } from "../models/userModel.js";
import { hashLinkToken } from "../services/userService.js";
import { PASSWORD, buildDataset } from "./seedData.js";

// npm run db:sample / db:empty — development and tests only (tech_stack.md §6.8). Both wipe
// the seven collections; db:sample then inserts the dataset, db:empty (`--empty`) inserts
// nothing. `seed` and `seed:reset` (`--reset`) are old aliases of db:sample. The public
// demo never reads this database.

const INVITE_DAYS = 7;
const COLLECTIONS = [
  [User, "users"],
  [Project, "projects"],
  [Task, "tasks"],
  [Report, "reports"],
  [Revision, "revisions"],
  [Holiday, "holidays"],
  [SeenMark, "seenMarks"],
];

/** Wipes the seven collections and syncs their indexes. Inserts nothing. */
export async function runEmpty() {
  await Promise.all(COLLECTIONS.map(([model]) => model.deleteMany({})));
  await Promise.all(COLLECTIONS.map(([model]) => model.syncIndexes()));
}

/** Wipes the seven collections and inserts the dataset built for `now`. Returns counts. */
export async function runSeed({ now = new Date() } = {}) {
  const data = buildDataset(now);

  // The invited person's link. The raw token is generated and dropped here: only its hash
  // is stored and nothing prints it, so a usable link comes from re-issuing the invite
  // (U4) in the app. Link tokens are never logged, returned or cached.
  const invitee = data.users.find((u) => u.status === "invited");
  Object.assign(invitee, {
    linkTokenHash: hashLinkToken(randomBytes(32).toString("base64url")),
    linkTokenPurpose: "invite",
    linkTokenExpiresAt: new Date(
      now.getTime() + INVITE_DAYS * 24 * 60 * 60 * 1000,
    ),
  });

  await runEmpty();
  const inserts = {
    users: data.users,
    projects: data.projects,
    tasks: data.tasks,
    reports: data.reports,
    revisions: data.revisions,
    holidays: data.holidays,
    seenMarks: data.seenMarks,
  };
  // Order matters only for readability; nothing here enforces references.
  for (const [model, name] of COLLECTIONS)
    await model.insertMany(inserts[name]);

  return {
    currentWeek: data.currentWeek,
    counts: Object.fromEntries(
      Object.entries(inserts).map(([name, docs]) => [name, docs.length]),
    ),
  };
}

async function main() {
  const empty = process.argv.includes("--empty");
  const { env } = await import("../config/env.js");
  if (env.NODE_ENV === "production") {
    console.error(
      `Refusing to ${empty ? "empty the database" : "load sample data"}: NODE_ENV is production. This command wipes data.`,
    );
    process.exit(1);
  }
  const { connectDb } = await import("../config/db.js");
  await connectDb();
  try {
    if (empty) {
      await runEmpty();
      console.log(
        "Database emptied. The first person to sign up becomes the owner.",
      );
      return;
    }
    const { currentWeek, counts } = await runSeed();
    console.log(`Seeded the current week, ${currentWeek}, and five before it.`);
    for (const [name, n] of Object.entries(counts))
      console.log(`  ${name}: ${n}`);
    console.log(`Every account signs in with the password "${PASSWORD}".`);
    console.log("  admin (owner): sanduni@example.com");
    console.log("  managers:      nadia@example.com, ruwan@example.com");
    console.log(
      "  members:       imali, tharindu, ayesha, dinesh, malith (@example.com)",
    );
  } finally {
    await mongoose.disconnect();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
