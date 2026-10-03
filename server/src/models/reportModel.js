import mongoose from "mongoose";
import { REPORT_STATUSES } from "../constants/reportStatus.js";
import { contentSchema } from "./contentSchema.js";
import { daySchema, daysValidators } from "./daySchema.js";
import { threadSchema } from "./threadSchema.js";

const { Schema } = mongoose;

// database_schema.md §1.4. One document per person per week, created by the first daily update.

const blockerResolutionSchema = new Schema(
  {
    blockerId: { type: Schema.Types.ObjectId, required: true },
    resolvedAt: { type: Date, required: true },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: false },
);

const latestCommentSchema = new Schema(
  {
    text: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    revisionNumber: { type: Number, required: true },
    createdAt: { type: Date, required: true },
  },
  { _id: false },
);

const reportSchema = new Schema(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    weekKey: {
      type: String,
      required: true,
      immutable: true,
      match: /^\d{4}-W\d{2}$/,
    },
    weekStart: { type: Date, required: true, immutable: true }, // Monday
    weekEnd: { type: Date, required: true, immutable: true }, // Friday
    status: {
      type: String,
      enum: REPORT_STATUSES,
      required: true,
      default: "draft",
    },
    approvalRequested: { type: Boolean, required: true, default: false },
    content: { type: contentSchema, required: true, default: () => ({}) }, // private until submitted
    days: { type: [daySchema], default: [], validate: daysValidators }, // shared with the team
    blockerResolutions: { type: [blockerResolutionSchema], default: [] },
    weekComments: { type: [threadSchema], default: [] },
    revisionNumber: { type: Number, required: true, default: 0 },
    submittedAt: { type: Date },
    lastActivityAt: { type: Date }, // submit and review only — not updatedAt
    interactionAt: { type: Date }, // every comment, reply and status change
    latestComment: { type: latestCommentSchema, default: null },
  },
  { timestamps: true, collection: "reports" },
);

reportSchema.index({ author: 1, weekKey: 1 }, { unique: true });
reportSchema.index({ weekKey: 1, status: 1 });
reportSchema.index({ status: 1, approvalRequested: 1, submittedAt: 1 });
reportSchema.index({ "days.lines.project": 1 });

export const Report = mongoose.model("Report", reportSchema);
