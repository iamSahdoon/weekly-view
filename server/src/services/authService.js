import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/userModel.js";
import { AppError } from "../utils/appError.js";
import { CLEAR_LINK, hashLinkToken, loadMe } from "./userService.js";

// Signup, login, password, link preview and accept (project_structure.md §2.1).

const BCRYPT_ROUNDS = 10;
// Compared against when there is no account, so an unknown email costs a bcrypt round too.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);

const signupClosed = () =>
  new AppError(403, "Sign-up is closed.", "SIGNUP_CLOSED");
const invalidCredentials = () =>
  new AppError(
    401,
    "That email and password don't match.",
    "INVALID_CREDENTIALS",
  );
// One response for every failure: expired, used, never valid, wrong purpose.
const linkInvalid = () =>
  new AppError(
    404,
    "This link has expired or has already been used.",
    "LINK_INVALID",
  );

// The payload is { sub, role, tokenVersion } and nothing else (tech_stack.md §2).
function signToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
      tokenVersion: user.tokenVersion,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN, algorithm: "HS256" },
  );
}

async function session(user) {
  return { token: signToken(user), user: await loadMe(user._id) };
}

/** A1 */
export async function bootstrapStatus() {
  return { available: !(await User.exists({})) };
}

/** A2 — open only while no user exists; the first account is the admin and owner. */
export async function signup({ name, email, password }) {
  if (await User.exists({})) throw signupClosed();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  let user;
  try {
    user = await User.create({
      name,
      email,
      passwordHash,
      role: "admin",
      status: "active",
      isOwner: true,
      workPeriods: [{ from: new Date(), to: null }],
    });
  } catch (err) {
    // The losing insert of a race (tech_stack.md §2.2), whichever unique index it hit.
    if (err?.code === 11000) throw signupClosed();
    throw err;
  }
  return session(user);
}

/** A3 — one code and one message for every cause. */
export async function login({ email, password }) {
  const user = await User.findOne({ email }).select("+passwordHash").lean();
  const matches = await bcrypt.compare(
    password,
    user?.passwordHash ?? DUMMY_HASH,
  );
  if (!user || !user.passwordHash || user.status !== "active" || !matches)
    throw invalidCredentials();
  return session(user);
}

/** A4 */
export function getMe(actor) {
  return loadMe(actor.id);
}

/** A5 — name only; email is an admin's change (U12). */
export async function updateMe(actor, { name }) {
  await User.updateOne({ _id: actor.id }, { $set: { name } });
  return loadMe(actor.id);
}

/** A6 — never 401, or the client would open the re-auth modal over the Account page. */
export async function changePassword(actor, { currentPassword, newPassword }) {
  const user = await User.findById(actor.id).select("+passwordHash").lean();
  const matches =
    !!user?.passwordHash &&
    (await bcrypt.compare(currentPassword, user.passwordHash));
  if (!matches) {
    throw new AppError(
      422,
      "Your current password is incorrect.",
      "CURRENT_PASSWORD_INCORRECT",
      { fields: { currentPassword: "That isn't your current password." } },
    );
  }
  // One update: the new hash and the version bump, so every other session dies.
  const updated = await User.findOneAndUpdate(
    { _id: actor.id },
    {
      $set: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) },
      $inc: { tokenVersion: 1 },
    },
    { new: true },
  ).lean();
  return session(updated);
}

// A live link: the hash matches, it hasn't expired, and the person is in the state its
// purpose needs — an invite completes an invited account, a reset an active one.
function liveLinkFilter(token, now) {
  return {
    linkTokenHash: hashLinkToken(token),
    linkTokenExpiresAt: { $gt: now },
    $or: [
      { linkTokenPurpose: "invite", status: "invited" },
      { linkTokenPurpose: "reset", status: "active" },
    ],
  };
}

/** A7 */
export async function previewLink({ token }) {
  const user = await User.findOne(liveLinkFilter(token, new Date()))
    .select("email role linkTokenPurpose")
    .lean();
  if (!user) throw linkInvalid();
  const purpose = user.linkTokenPurpose;
  return purpose === "invite"
    ? { purpose, email: user.email, role: user.role }
    : { purpose, email: user.email };
}

/** A8 — conditioned on the same hash, so two concurrent accepts cannot both succeed. */
export async function acceptLink({ token, password, name }) {
  const now = new Date();
  const filter = liveLinkFilter(token, now);
  const link = await User.findOne(filter).select("linkTokenPurpose").lean();
  if (!link) throw linkInvalid();
  const purpose = link.linkTokenPurpose;
  if (purpose === "invite" && !name) {
    throw new AppError(
      422,
      "Some fields need attention.",
      "VALIDATION_FAILED",
      {
        fields: { name: "Required" },
      },
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const update =
    purpose === "invite"
      ? {
          $set: { name, passwordHash, status: "active" },
          $push: { workPeriods: { from: now, to: null } },
          $unset: CLEAR_LINK,
        }
      : {
          $set: { passwordHash },
          $inc: { tokenVersion: 1 },
          $unset: CLEAR_LINK,
        };
  const user = await User.findOneAndUpdate(
    { _id: link._id, ...filter, linkTokenPurpose: purpose },
    update,
    { new: true },
  ).lean();
  if (!user) throw linkInvalid();
  return session(user);
}
