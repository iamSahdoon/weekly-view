import mongoose from "mongoose";

const { Schema } = mongoose;

// database_schema.md §1.2. Progress is derived, never stored (§5.3).

const planFields = {
  startDate: { type: Date, required: true }, // UTC midnight; the first working day counted
  plannedDays: {
    type: Number,
    required: true,
    min: 1,
    validate: Number.isInteger,
  },
  plannedHours: { type: Number, min: 0, default: null },
};

const planSchema = new Schema(planFields, { _id: false });

const planHistorySchema = new Schema(
  {
    ...planFields,
    changedAt: { type: Date, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: false },
);

const projectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["active", "inactive"],
      required: true,
      default: "active",
    },
    plan: { type: planSchema, default: null },
    planHistory: { type: [planHistorySchema], default: [] }, // append-only
  },
  { timestamps: true, collection: "projects" },
);

// Unique across active and inactive, case-insensitively: a deactivated name stays reserved.
projectSchema.index(
  { name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } },
);

export const Project = mongoose.model("Project", projectSchema);
