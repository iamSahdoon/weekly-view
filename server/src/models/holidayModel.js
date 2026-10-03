import mongoose from "mongoose";

const { Schema } = mongoose;

// database_schema.md §1.8. Adding or removing one changes no other stored document.

const isWorkingDayAtUtcMidnight = (d) =>
  d.getUTCHours() === 0 &&
  d.getUTCMinutes() === 0 &&
  d.getUTCSeconds() === 0 &&
  d.getUTCMilliseconds() === 0 &&
  d.getUTCDay() >= 1 &&
  d.getUTCDay() <= 5;

const holidaySchema = new Schema(
  {
    date: {
      type: Date,
      required: true,
      validate: {
        validator: isWorkingDayAtUtcMidnight,
        message: "A holiday is a Monday to Friday.",
      },
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, collection: "holidays" },
);

holidaySchema.index({ date: 1 }, { unique: true });

export const Holiday = mongoose.model("Holiday", holidaySchema);
