// Vercel entry point (owner decision: the API may run on Vercel as a serverless
// function instead of Render; see docs/DEPLOYMENT.md). Each warm instance connects
// to MongoDB once, then hands every request to the same Express app that Render,
// local dev and the tests use. server.js (listen) is not used on Vercel.
import app from "../src/app.js";
import { connectDb } from "../src/config/db.js";

let connecting;

export default async function handler(req, res) {
  try {
    connecting ??= connectDb();
    await connecting;
  } catch (err) {
    connecting = undefined; // try again on the next request
    // The name and message only: never the connection string.
    console.error(`Could not connect to MongoDB (${err.name}): ${err.message}`);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: false,
        data: null,
        message:
          "The service could not reach its database. Try again in a moment.",
        error: { code: "INTERNAL_ERROR" },
      }),
    );
    return;
  }
  return app(req, res);
}
