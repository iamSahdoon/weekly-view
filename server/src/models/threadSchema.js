import mongoose from "mongoose";

const { Schema } = mongoose;

// database_schema.md §1.9. Used for days[].comments and Report.weekComments. The dates are
// written by the service from its own clock — the 10-minute window is measured against
// them — so the schema carries them as plain fields, not Mongoose timestamps.

const text = {
  type: String,
  required: true,
  trim: true,
  minlength: 1,
  maxlength: 2000,
};

const replySchema = new Schema({
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  text,
  createdAt: { type: Date, required: true },
  editedAt: { type: Date, default: null },
});

export const threadSchema = new Schema({
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  text,
  createdAt: { type: Date, required: true },
  editedAt: { type: Date, default: null },
  replies: { type: [replySchema], default: [] },
  // Week comments only.
  revisionNumber: { type: Number },
  kind: { type: String, enum: ["comment", "approval", "send_back"] },
});
