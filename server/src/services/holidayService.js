import { Holiday } from "../models/holidayModel.js";
import { AppError } from "../utils/appError.js";
import { toDateString } from "../utils/weeks.js";
import { userRef } from "./userService.js";

// Admins' team calendar (requirments_doc.md §16). No write here touches another
// collection: everything that depends on holidays is derived (database_schema.md §1.8).
// A date already taken loses on the { date: 1 } index → HOLIDAY_EXISTS (errorHandler).

const holidayNotFound = () =>
  new AppError(404, "That holiday doesn't exist.", "HOLIDAY_NOT_FOUND");

const toItem = (holiday) => ({
  _id: holiday._id,
  date: toDateString(holiday.date),
  name: holiday.name,
  createdBy: holiday.createdBy ? userRef(holiday.createdBy) : null,
});

const populateCreator = { path: "createdBy", select: "name role status leave" };

async function loadItem(id) {
  const holiday = await Holiday.findById(id).populate(populateCreator).lean();
  if (!holiday) throw holidayNotFound();
  return toItem(holiday);
}

/** HD1 — by date; bounded by the validator to one year. */
export async function listHolidays(actor, { from, to }) {
  const holidays = await Holiday.find({ date: { $gte: from, $lte: to } })
    .populate(populateCreator)
    .sort({ date: 1 })
    .lean();
  return { items: holidays.map(toItem) };
}

/** HD2 */
export async function createHoliday(actor, { date, name }) {
  const holiday = await Holiday.create({ date, name, createdBy: actor.id });
  return loadItem(holiday._id);
}

/** HD3 */
export async function updateHoliday(actor, id, changes) {
  const set = {};
  if (changes.date !== undefined) set.date = changes.date;
  if (changes.name !== undefined) set.name = changes.name;
  const updated = await Holiday.updateOne(
    { _id: id },
    { $set: set },
    { runValidators: true },
  );
  if (updated.matchedCount === 0) throw holidayNotFound();
  return loadItem(id);
}

/** HD4 — a real delete: a holiday is configuration, not authored work. */
export async function deleteHoliday(actor, id) {
  const deleted = await Holiday.findByIdAndDelete(id)
    .populate(populateCreator)
    .lean();
  if (!deleted) throw holidayNotFound();
  return toItem(deleted);
}
