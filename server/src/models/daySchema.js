import mongoose from "mongoose";
import { TASK_TYPES } from "../constants/taskTypes.js";
import { WEEKDAYS } from "../constants/weekdays.js";
import { threadSchema } from "./threadSchema.js";

const { Schema } = mongoose;

// database_schema.md §1.7 — a daily update. Report.days carries comments; Revision.days is
// the snapshot as submitted, without them.

const lineSchema = new Schema({
  task: { type: Schema.Types.ObjectId, ref: "Task", required: true },
  project: { type: Schema.Types.ObjectId, ref: "Project", required: true }, // copied from the task
  taskType: { type: String, enum: TASK_TYPES, required: true },
  text: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 500,
  },
  hours: {
    type: Number,
    required: true,
    validate: {
      validator: (h) => h > 0 && Number.isInteger(h * 4),
      message: "Hours must be more than 0, in quarter hours.",
    },
  },
});

// _id retained: blockerResolutions reference it.
const blockerSchema = new Schema({
  text: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 500,
  },
  isKey: { type: Boolean, default: false },
});

const dayFields = {
  weekday: { type: String, enum: WEEKDAYS, required: true },
  lines: {
    type: [lineSchema],
    validate: {
      validator: (lines) => lines.length >= 1,
      message: "A daily update needs at least one line.",
    },
  },
  blockers: {
    type: [blockerSchema],
    default: [],
    validate: {
      validator: (b) => b.length <= 10,
      message: "At most 10 blockers a day.",
    },
  },
  openToTeam: { type: Boolean, default: false },
  postedAt: { type: Date },
  editedAt: { type: Date, default: null },
};

export const daySchema = new Schema(
  { ...dayFields, comments: { type: [threadSchema], default: [] } },
  { _id: false },
);

export const daySnapshotSchema = new Schema(dayFields, { _id: false });

// Shared by Report.days and Revision.days: one entry per weekday, at most one key blocker
// across the whole week.
export const daysValidators = [
  {
    validator: (days) =>
      new Set(days.map((d) => d.weekday)).size === days.length,
    message: "Each weekday appears at most once.",
  },
  {
    validator: (days) =>
      days.flatMap((d) => d.blockers ?? []).filter((b) => b.isKey).length <= 1,
    message: "At most one blocker can be the key issue.",
  },
];
