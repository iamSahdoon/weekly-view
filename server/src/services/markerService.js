import { Report } from "../models/reportModel.js";
import { SeenMark } from "../models/seenMarkModel.js";
import { canOpenWeek } from "../policies/reportPolicy.js";
import { AppError } from "../utils/appError.js";

// "New" markers (database_schema.md §1.10, §5.4). S4 writes seen marks (R13); S5 adds
// isNew for rows and threads and the sidebar dots (N1). It never decides access.

/** R13 — upserts the actor's mark on a week they may open. */
export async function markSeen(actor, reportId) {
  const report = await Report.findById(reportId).select("author status").lean();
  if (!report)
    throw new AppError(404, "That report doesn't exist.", "REPORT_NOT_FOUND");
  if (!canOpenWeek(actor, report))
    throw new AppError(
      403,
      "You don't have access to this report.",
      "REPORT_FORBIDDEN",
    );
  const write = () =>
    SeenMark.updateOne(
      { user: actor.id, report: report._id },
      { $set: { seenAt: new Date() } },
      { upsert: true },
    );
  try {
    await write();
  } catch (err) {
    // Two concurrent first opens: the loser's upsert hits { user, report }; retry once.
    if (err?.code !== 11000) throw err;
    await write();
  }
  return null;
}
