import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { User } from "../models/userModel.js";
import { AppError } from "../utils/appError.js";

const unauthenticated = () =>
  new AppError(
    401,
    "Your session has ended. Sign in again.",
    "UNAUTHENTICATED",
  );

// Bearer JWT → the active user whose tokenVersion still matches. Every failure is the
// same 401, so the response never says which check failed.
export async function authenticate(req, res, next) {
  const [scheme, token] = (req.get("authorization") ?? "").split(" ");
  if (scheme !== "Bearer" || !token) throw unauthenticated();

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    throw unauthenticated();
  }
  if (!mongoose.isValidObjectId(payload.sub)) throw unauthenticated();

  const user = await User.findById(payload.sub).lean();
  if (
    !user ||
    user.status !== "active" ||
    user.tokenVersion !== payload.tokenVersion
  ) {
    throw unauthenticated();
  }
  req.user = user;
  next();
}
