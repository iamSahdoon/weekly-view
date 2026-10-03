import jwt from "jsonwebtoken";
import { env } from "../../src/config/env.js";
import { User } from "../../src/models/userModel.js";

// The token factory, so no test builds a JWT by hand.

let counter = 0;

/** Inserts an active user on the team since 2026-01-05 and returns the plain document. */
export async function createUser(overrides = {}) {
  counter += 1;
  const user = await User.create({
    name: `Test User ${counter}`,
    email: `user${counter}@example.com`,
    role: "member",
    status: "active",
    workPeriods: [{ from: new Date("2026-01-05T00:00:00.000Z"), to: null }],
    ...overrides,
  });
  return user.toObject();
}

/** A signed JWT carrying { sub, role, tokenVersion }, as login will issue it. */
export function tokenFor(user, options = {}) {
  return jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
      tokenVersion: user.tokenVersion ?? 0,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN, ...options },
  );
}

/** The Authorization header value for `user`. */
export function bearer(user, options) {
  return `Bearer ${tokenFor(user, options)}`;
}

/** A seeded actor: the user, its token, and the actor object services receive. */
export async function createActor(role = "member", overrides = {}) {
  const user = await createUser({ role, ...overrides });
  return {
    user,
    token: tokenFor(user),
    actor: { id: user._id, role: user.role, isOwner: !!user.isOwner },
  };
}
