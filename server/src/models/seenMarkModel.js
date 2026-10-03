import mongoose from "mongoose";

const { Schema } = mongoose;

// database_schema.md §1.10 — when each person last opened each week.

const seenMarkSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    report: { type: Schema.Types.ObjectId, ref: "Report", required: true },
    seenAt: { type: Date, required: true },
  },
  { timestamps: true, collection: "seenMarks" },
);

seenMarkSchema.index({ user: 1, report: 1 }, { unique: true });

export const SeenMark = mongoose.model("SeenMark", seenMarkSchema);
