import mongoose from "mongoose";

const { Schema } = mongoose;

// database_schema.md §1.3. A task's status belongs to a week (content.tasks), not here.

const taskSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 200,
    },
    // Fixed once any line names the task; the service enforces that.
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    doneAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "tasks" },
);

taskSchema.index({ owner: 1, doneAt: 1 });

export const Task = mongoose.model("Task", taskSchema);
