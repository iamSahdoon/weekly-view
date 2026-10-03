import mongoose from "mongoose";
import { ROLES } from "../constants/roles.js";

const { Schema } = mongoose;

// database_schema.md §1.1.

const workPeriodSchema = new Schema(
  {
    from: { type: Date, required: true },
    to: { type: Date, default: null },
  },
  { _id: false },
);

const leavePeriodSchema = new Schema(
  {
    from: { type: Date, required: true },
    to: { type: Date, default: null },
    setBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    // Empty while invited: the person types it when they accept.
    name: {
      type: String,
      trim: true,
      default: "",
      required: function () {
        return this.status !== "invited";
      },
    },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false }, // absent while invited
    role: { type: String, enum: ROLES, required: true, default: "member" },
    projects: {
      type: [{ type: Schema.Types.ObjectId, ref: "Project" }],
      default: [],
    },
    status: {
      type: String,
      enum: ["invited", "active", "removed"],
      required: true,
      default: "active",
    },
    workPeriods: { type: [workPeriodSchema], default: [] },
    // SHA-256 of a one-time invite or reset token. Clear with $unset, never null:
    // the unique sparse index skips only documents where the field is absent.
    linkTokenHash: { type: String, select: false },
    linkTokenPurpose: { type: String, enum: ["invite", "reset"] },
    linkTokenExpiresAt: { type: Date },
    isOwner: { type: Boolean }, // true on exactly one account; otherwise absent
    leave: { type: [leavePeriodSchema], default: [] },
    tokenVersion: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: true,
    collection: "users",
    toJSON: {
      // Defence in depth behind .select(); not a field-shape change.
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.linkTokenHash;
        delete ret.tokenVersion;
        return ret;
      },
    },
  },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ projects: 1 });
userSchema.index({ status: 1 });
userSchema.index({ linkTokenHash: 1 }, { unique: true, sparse: true });
userSchema.index(
  { isOwner: 1 },
  { unique: true, partialFilterExpression: { isOwner: true } },
);

export const User = mongoose.model("User", userSchema);
