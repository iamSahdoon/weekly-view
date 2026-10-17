import mongoose from "mongoose";
import app from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";

try {
  await connectDb();
} catch (err) {
  // The name and message only: never the connection string.
  console.error(`Could not connect to MongoDB (${err.name}): ${err.message}`);
  process.exit(1);
}
console.log("MongoDB connected");

const server = app.listen(env.PORT, () => {
  console.log(`API listening on :${env.PORT}`);
});

// A restart (a deploy on Render, `node --watch` in development) sends SIGTERM. Stop taking
// new connections and let the requests in flight finish first: a sign-up killed between its
// write and its response creates the account but answers nothing, so the browser says it
// couldn't reach the server (owner report, 2026-10-17). Ten seconds at most. Windows ends a
// process without a signal, so there this can't help; `--watch-path=src` (package.json)
// keeps installs and file scanners from restarting the API in the first place.
function shutdown() {
  server.close(() => mongoose.disconnect().finally(() => process.exit(0)));
  setTimeout(() => process.exit(0), 10_000).unref();
}
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
