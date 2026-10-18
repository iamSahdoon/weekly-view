import { pathToFileURL } from "node:url";
import mongoose from "mongoose";
import { User } from "../models/userModel.js";
import { issueResetLink } from "../services/userService.js";
import { AppError } from "../utils/appError.js";

// npm run owner:reset-link [-- --url <site address>] — the way back in for an owner who
// forgot their password (requirments_doc.md §11.3). Whoever holds MONGODB_URI runs it; it
// issues the owner a normal 24-hour reset link through the same service function an admin's
// U13 uses, so the token rules are not repeated here. It sets and prints no password and
// touches no other user.
//
// The link is printed once, to the terminal, and nowhere else: not to a file, not to a log.
// That is the one deliberate exception to "never log a link token" (tech_stack.md §2.1) —
// the operator sees it once, as an admin sees it once in the response that issues it.

/** A refusal with a message the operator can act on. */
export class RecoveryError extends Error {}

/** Checks a `--url` value: an http(s) address, no credentials, query or fragment. */
export function parseSiteUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new RecoveryError(
      `"${value}" isn't a web address. Use something like https://your-site.vercel.app`,
    );
  }
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new RecoveryError("--url must start with http:// or https://");
  if (url.username || url.password || url.search || url.hash)
    throw new RecoveryError(
      "--url must be the plain site address, with no login, query or # part.",
    );
  return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
}

/** `--url <address>` or `--url=<address>`; anything else is refused. */
export function parseArgs(argv) {
  let url;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    let value;
    if (arg === "--url") {
      value = argv[(i += 1)];
      if (value === undefined)
        throw new RecoveryError("--url needs a site address after it.");
    } else if (arg.startsWith("--url=")) {
      value = arg.slice("--url=".length);
    } else {
      throw new RecoveryError(
        `Unknown option "${arg}". The only option is --url <site address>.`,
      );
    }
    url = parseSiteUrl(value);
  }
  return { url };
}

/**
 * Issues the owner a reset link and returns it with who it is for. `url` overrides
 * CLIENT_URL. Needs a connected Mongoose; connecting and disconnecting is `main`'s.
 */
export async function issueOwnerResetLink({ url } = {}) {
  const owner = await User.findOne({ isOwner: true })
    .select("name email role status")
    .lean();
  if (!owner)
    throw new RecoveryError(
      "There is no owner in this database yet. Open the site and create the owner account instead.",
    );
  // The owner acting on their own account: the same gate an admin's reset passes.
  const actor = { id: owner._id, role: owner.role, isOwner: true };
  let issued;
  try {
    issued = await issueResetLink(actor, owner._id, { baseUrl: url });
  } catch (error) {
    if (error instanceof AppError)
      throw new RecoveryError(
        `Couldn't issue the link: ${error.message} (${error.code})`,
      );
    throw error;
  }
  return {
    owner: { name: owner.name, email: owner.email },
    linkUrl: issued.linkUrl,
    expiresAt: issued.expiresAt,
  };
}

async function main() {
  const { url } = parseArgs(process.argv.slice(2));
  const { connectDb } = await import("../config/db.js");
  try {
    await connectDb();
  } catch {
    await mongoose.disconnect().catch(() => {});
    // Not the underlying error: its text can carry the connection string.
    throw new RecoveryError(
      "Couldn't reach the database. Check MONGODB_URI in server/.env and, for Atlas, that your IP address is allowed in Network Access.",
    );
  }
  try {
    const { owner, linkUrl, expiresAt } = await issueOwnerResetLink({ url });
    console.log("Password reset link for the owner");
    console.log(`  Name:     ${owner.name}`);
    console.log(`  Email:    ${owner.email}`);
    console.log(
      `  Expires:  ${expiresAt.toLocaleString()} (local) · ${expiresAt.toISOString()}`,
    );
    console.log(`  Link:     ${linkUrl}`);
    console.log("");
    console.log(
      "Open the link in a browser and choose a new password. It works once, any earlier link",
    );
    console.log(
      "has stopped working, and it is shown here only this time. Nothing else was changed.",
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
    if (error instanceof RecoveryError) console.error(error.message);
    else console.error("Something went wrong:", error.message);
    process.exitCode = 1;
  });
}
