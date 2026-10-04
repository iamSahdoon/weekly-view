import mongoose from "mongoose";
import { Report } from "../models/reportModel.js";
import { Task } from "../models/taskModel.js";

// The task picker; creating a task when a day names a new one arrives with R5 in S4
// (project_structure.md §2.5).

/** T1 — always the actor's own tasks, open ones unless `includeDone`. Bounded. */
export async function listTasks(actor, { includeDone }) {
  const owner = new mongoose.Types.ObjectId(String(actor.id));
  const filter = { owner };
  if (!includeDone) filter.doneAt = null;
  const tasks = await Task.find(filter)
    .populate("project", "name status")
    .collation({ locale: "en", strength: 2 })
    .sort({ name: 1, _id: 1 })
    .lean();

  // Hours and the latest week come from the actor's own lines, every report status.
  const totals = await Report.aggregate([
    { $match: { author: owner } },
    { $unwind: "$days" },
    { $unwind: "$days.lines" },
    {
      $group: {
        _id: "$days.lines.task",
        hours: { $sum: "$days.lines.hours" },
        lastWeekKey: { $max: "$weekKey" },
      },
    },
  ]);
  const byTask = new Map(totals.map((t) => [String(t._id), t]));

  return {
    items: tasks.map((task) => {
      const total = byTask.get(String(task._id));
      return {
        _id: task._id,
        name: task.name,
        project: task.project && {
          _id: task.project._id,
          name: task.project.name,
          status: task.project.status,
        },
        doneAt: task.doneAt ?? null,
        hoursTotal: total?.hours ?? 0,
        lastWeekKey: total?.lastWeekKey ?? null,
      };
    }),
  };
}
