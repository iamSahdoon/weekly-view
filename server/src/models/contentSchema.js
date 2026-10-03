import mongoose from "mongoose";
import { TASK_STATUSES } from "../constants/taskStatus.js";

const { Schema } = mongoose;

// database_schema.md §1.6 — the end-of-week additions. Report.content and Revision.content
// use this one schema, so a revision is a verbatim copy rather than a mapping.

const taskEntrySchema = new Schema(
  {
    task: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    status: { type: String, enum: TASK_STATUSES, default: null }, // required at submit, not here
    note: { type: String, trim: true, maxlength: 2000, default: "" },
  },
  { _id: false },
);

const achievementSchema = new Schema({
  text: { type: String, required: true, trim: true },
  isKey: { type: Boolean, default: false },
});

const linkSchema = new Schema(
  {
    label: { type: String, trim: true },
    url: { type: String, required: true, trim: true },
  },
  { _id: false },
);

export const contentSchema = new Schema(
  {
    tasks: { type: [taskEntrySchema], default: [] },
    nextWeek: { type: [String], default: [] },
    achievements: {
      type: [achievementSchema],
      default: [],
      validate: {
        validator: (items) => items.filter((a) => a.isKey).length <= 1,
        message: "At most one achievement can be the key achievement.",
      },
    },
    notes: { type: String, default: "" },
    links: { type: [linkSchema], default: [] },
  },
  { _id: false },
);
