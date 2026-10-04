import mongoose from "mongoose";
import { Project } from "../models/projectModel.js";
import { Report } from "../models/reportModel.js";
import { Task } from "../models/taskModel.js";
import { AppError } from "../utils/appError.js";

// The task picker, and the tasks a day names or starts (project_structure.md §2.5).
// reportService calls these inside the day write; it never writes `tasks` itself.

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

const taskNotFound = () =>
  new AppError(404, "That task doesn't exist.", "TASK_NOT_FOUND");

/**
 * R5 step 3: every task id must be the actor's own, and open — or already named in this
 * week, so a day naming a task closed since can still be saved. Every `newTask` project
 * must exist and be active. Returns the named tasks keyed by id. Writes nothing.
 */
export async function checkLineTasks(
  actor,
  { taskIds, newTasks, weekTaskIds },
) {
  const unique = [...new Set(taskIds.map((id) => id.toLowerCase()))];
  const tasks = await Task.find({ _id: { $in: unique }, owner: actor.id })
    .select("project doneAt")
    .lean();
  const byId = new Map(tasks.map((t) => [String(t._id), t]));
  const inWeek = new Set(weekTaskIds.map(String));
  for (const id of unique) {
    const task = byId.get(id);
    if (!task || (task.doneAt && !inWeek.has(id))) throw taskNotFound();
  }

  const projectIds = [...new Set(newTasks.map((t) => t.project.toLowerCase()))];
  if (projectIds.length === 0) return byId;
  const projects = await Project.find({ _id: { $in: projectIds } })
    .select("status")
    .lean();
  if (projects.length !== projectIds.length)
    throw new AppError(404, "That project doesn't exist.", "PROJECT_NOT_FOUND");
  if (projects.some((p) => p.status !== "active"))
    throw new AppError(
      422,
      "That project is no longer active.",
      "PROJECT_INACTIVE",
    );
  return byId;
}

/** Inserts the tasks a day starts, in order, owned by the actor. */
export async function createTasks(actor, newTasks) {
  if (newTasks.length === 0) return [];
  return Task.insertMany(
    newTasks.map((t) => ({
      owner: actor.id,
      name: t.name,
      project: t.project,
    })),
    { ordered: true },
  );
}

/** Removes tasks created for a day write that then lost to a status change. */
export async function discardTasks(tasks) {
  if (tasks.length === 0) return;
  await Task.deleteMany({ _id: { $in: tasks.map((t) => t._id) } });
}

/** R7 step 4: `doneAt` follows the submitted statuses. */
export async function syncDoneAt(contentTasks, now) {
  const done = contentTasks
    .filter((t) => t.status === "done")
    .map((t) => t.task);
  const open = contentTasks
    .filter((t) => t.status !== "done")
    .map((t) => t.task);
  await Promise.all([
    done.length > 0 &&
      Task.updateMany(
        { _id: { $in: done }, doneAt: null },
        { $set: { doneAt: now } },
      ),
    open.length > 0 &&
      Task.updateMany({ _id: { $in: open } }, { $set: { doneAt: null } }),
  ]);
}
