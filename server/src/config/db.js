import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDb() {
  await mongoose.connect(env.MONGODB_URI, {
    maxPoolSize: 10, // Atlas M0 caps at 500 connections across all clients
    serverSelectionTimeoutMS: 10000,
  });
  return mongoose.connection;
}
