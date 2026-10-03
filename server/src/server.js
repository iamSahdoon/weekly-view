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

app.listen(env.PORT, () => {
  console.log(`API listening on :${env.PORT}`);
});
