import mongoose from "mongoose";
import { contentSchema } from "./contentSchema.js";
import { daySnapshotSchema, daysValidators } from "./daySchema.js";

const { Schema } = mongoose;

// database_schema.md §1.5. The snapshot is written once; the review fields are written once
// more, by the review outcome, and never again.

const revisionSchema = new Schema(
  {
    report: {
      type: Schema.Types.ObjectId,
      ref: "Report",
      required: true,
      immutable: true,
    },
    revisionNumber: { type: Number, required: true, min: 1, immutable: true },
    content: { type: contentSchema, required: true },
    days: { type: [daySnapshotSchema], default: [], validate: daysValidators },
    approvalRequested: {
      type: Boolean,
      required: true,
      default: false,
      immutable: true,
    },
    submittedAt: { type: Date, required: true, immutable: true },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    action: {
      type: String,
      enum: ["approved", "changes_requested", null],
      default: null,
    },
    comment: {
      type: String,
      trim: true,
      required: function () {
        return this.action === "changes_requested";
      },
      validate: {
        validator: function (c) {
          return this.action !== "changes_requested" || c.length >= 10;
        },
        message: "A send-back comment needs at least 10 characters.",
      },
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { timestamps: true, collection: "revisions" },
);

revisionSchema.index({ report: 1, revisionNumber: 1 }, { unique: true });
revisionSchema.index({ submittedAt: -1 });
revisionSchema.index({ reviewedAt: -1 });

export const Revision = mongoose.model("Revision", revisionSchema);
