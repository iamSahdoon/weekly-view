import mongoose from "mongoose";
import { Project } from "../models/projectModel.js";
import { Report } from "../models/reportModel.js";
import { Task } from "../models/taskModel.js";
import { User } from "../models/userModel.js";
import { AppError } from "../utils/appError.js";
import { toDateString } from "../utils/weeks.js";
import * as calendar from "./calendarService.js";
import { userRef } from "./userService.js";

// Projects, plans, plan history, progress (project_structure.md §2.5). Progress is
// derived on every read, never stored (database_schema.md §5.3).

const NAME_ORDER = { locale: "en", strength: 2 };
const MEMBER_STATUSES = ["invited", "active"]; // a removed person is no longer a member

const projectNotFound = () =>
  new AppError(404, "That project doesn't exist.", "PROJECT_NOT_FOUND");

const isStaff = (actor) => actor.role !== "member";

// ---------------------------------------------------------------- progress

const planOut = (plan) => ({
  startDate: toDateString(plan.startDate),
  plannedDays: plan.plannedDays,
  plannedHours: plan.plannedHours ?? null,
});

/** ProjectProgress (api_specification.md §1.10). `daysLeft` is never negative. */
function progressOf(project, { today, holidays, hours, changers }) {
  const daysUsed = calendar.planDaysUsed(project.plan, today, holidays);
  const { plannedDays } = project.plan;
  return {
    plan: planOut(project.plan),
    daysUsed,
    daysLeft: Math.max(plannedDays - daysUsed, 0),
    overdueDays: Math.max(daysUsed - plannedDays, 0),
    hoursLogged: hours.get(String(project._id)) ?? 0,
    planHistory: (project.planHistory ?? []).map((entry) => ({
      ...planOut(entry),
      changedAt: entry.changedAt,
      changedBy: changers.get(String(entry.changedBy)) ?? null,
    })),
  };
}

/** Hours on every work line naming each project, every report status. */
async function hoursByProject(projectIds) {
  if (projectIds.length === 0) return new Map();
  const rows = await Report.aggregate([
    { $match: { "days.lines.project": { $in: projectIds } } },
    { $unwind: "$days" },
    { $unwind: "$days.lines" },
    { $match: { "days.lines.project": { $in: projectIds } } },
    {
      $group: {
        _id: "$days.lines.project",
        hours: { $sum: "$days.lines.hours" },
      },
    },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.hours]));
}

async function changersOf(projects) {
  const ids = projects.flatMap((p) =>
    (p.planHistory ?? []).map((e) => e.changedBy),
  );
  if (ids.length === 0) return new Map();
  const users = await User.find({ _id: { $in: ids } })
    .select("name role status leave")
    .lean();
  return new Map(users.map((u) => [String(u._id), userRef(u)]));
}

/** Progress for each planned project in `projects`, keyed by id. */
async function progressFor(projects) {
  const planned = projects.filter((p) => p.plan);
  if (planned.length === 0) return new Map();
  const today = calendar.todayUtc();
  const [holidays, hours, changers] = await Promise.all([
    calendar.holidaysForPlans(
      planned.map((p) => p.plan),
      today,
    ),
    hoursByProject(planned.map((p) => p._id)),
    changersOf(planned),
  ]);
  return new Map(
    planned.map((p) => [
      String(p._id),
      progressOf(p, { today, holidays, hours, changers }),
    ]),
  );
}

// ---------------------------------------------------------------- items

async function staffExtras(projectIds) {
  const [members, tasks] = await Promise.all([
    User.aggregate([
      {
        $match: {
          projects: { $in: projectIds },
          status: { $in: MEMBER_STATUSES },
        },
      },
      { $unwind: "$projects" },
      { $match: { projects: { $in: projectIds } } },
      { $sort: { _id: 1 } },
      { $group: { _id: "$projects", ids: { $push: "$_id" } } },
    ]),
    Task.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: "$project", n: { $sum: 1 } } },
    ]),
  ]);
  return {
    members: new Map(members.map((r) => [String(r._id), r.ids])),
    taskCounts: new Map(tasks.map((r) => [String(r._id), r.n])),
  };
}

/**
 * P1 items for `actor`. Every role: `{ _id, name, description, status }`, plus `progress`
 * on the projects they are assigned to. Managers and admins: `progress` on every project
 * (null without a plan), `memberIds`, `memberCount`, `taskCount`, `createdAt`.
 */
async function toItems(actor, projects) {
  const ids = projects.map((p) => p._id);
  if (isStaff(actor)) {
    const [progress, { members, taskCounts }] = await Promise.all([
      progressFor(projects),
      staffExtras(ids),
    ]);
    return projects.map((p) => {
      const key = String(p._id);
      const memberIds = members.get(key) ?? [];
      return {
        _id: p._id,
        name: p.name,
        description: p.description,
        status: p.status,
        progress: progress.get(key) ?? null,
        memberIds,
        memberCount: memberIds.length,
        taskCount: taskCounts.get(key) ?? 0,
        createdAt: p.createdAt,
      };
    });
  }

  const me = await User.findById(actor.id).select("projects").lean();
  const assigned = new Set((me?.projects ?? []).map(String));
  const progress = await progressFor(
    projects.filter((p) => assigned.has(String(p._id))),
  );
  return projects.map((p) => {
    const key = String(p._id);
    const item = {
      _id: p._id,
      name: p.name,
      description: p.description,
      status: p.status,
    };
    if (assigned.has(key)) item.progress = progress.get(key) ?? null;
    return item;
  });
}

async function loadItem(actor, projectId) {
  const project = await Project.findById(projectId).lean();
  if (!project) throw projectNotFound();
  const [item] = await toItems(actor, [project]);
  return item;
}

// ---------------------------------------------------------------- reads

/** P1 — bounded, sorted by name. */
export async function listProjects(actor, { status, mine, usedInWeek }) {
  const and = [];
  if (usedInWeek) {
    // The dashboard filter: active projects, plus inactive ones a line that week names.
    const named = await Report.distinct("days.lines.project", {
      weekKey: usedInWeek,
    });
    and.push({ $or: [{ status: "active" }, { _id: { $in: named } }] });
  } else if (status !== "all") {
    and.push({ status });
  }
  if (mine) {
    const me = await User.findById(actor.id).select("projects").lean();
    and.push({ _id: { $in: me?.projects ?? [] } });
  }
  const projects = await Project.find(and.length > 0 ? { $and: and } : {})
    .collation(NAME_ORDER)
    .sort({ name: 1, _id: 1 })
    .lean();
  return { items: await toItems(actor, projects) };
}

// ---------------------------------------------------------------- writes

async function assertMembers(memberIds) {
  const unique = [...new Set(memberIds.map((id) => id.toLowerCase()))];
  const found = await User.countDocuments({
    _id: { $in: unique },
    status: { $in: MEMBER_STATUSES },
  });
  if (found !== unique.length) {
    throw new AppError(
      422,
      "Some fields need attention.",
      "VALIDATION_FAILED",
      {
        fields: { memberIds: "Pick people who are on the team." },
      },
    );
  }
  return unique.map((id) => new mongoose.Types.ObjectId(id));
}

// `memberIds` replaces membership among invited and active people; a removed person's
// record is left as it was (they are not served as members either way).
async function setMembers(projectId, memberIds) {
  await User.updateMany(
    { _id: { $in: memberIds } },
    { $addToSet: { projects: projectId } },
  );
  await User.updateMany(
    {
      projects: projectId,
      _id: { $nin: memberIds },
      status: { $in: MEMBER_STATUSES },
    },
    { $pull: { projects: projectId } },
  );
}

/** P2 */
export async function createProject(
  actor,
  { name, description, memberIds, plan },
) {
  const members = await assertMembers(memberIds);
  // A taken name loses on the { name: 1 } collation index → PROJECT_NAME_TAKEN.
  const project = await Project.create({ name, description, plan });
  if (members.length > 0) await setMembers(project._id, members);
  return loadItem(actor, project._id);
}

/** P3 */
export async function updateProject(
  actor,
  projectId,
  { name, description, memberIds },
) {
  const project = await Project.findById(projectId).select("_id").lean();
  if (!project) throw projectNotFound();
  const members = memberIds && (await assertMembers(memberIds));
  const set = {};
  if (name !== undefined) set.name = name;
  if (description !== undefined) set.description = description;
  if (Object.keys(set).length > 0) {
    await Project.updateOne(
      { _id: project._id },
      { $set: set },
      { runValidators: true },
    );
  }
  if (members) await setMembers(project._id, members);
  return loadItem(actor, project._id);
}

/**
 * P4 — set or extend the plan. The plan being replaced is appended to `planHistory` in
 * the same single-document write, so two concurrent changes can't record one plan twice.
 */
export async function setPlan(
  actor,
  projectId,
  { startDate, plannedDays, plannedHours },
) {
  const plan = { startDate, plannedDays, plannedHours };
  const updated = await Project.updateOne({ _id: projectId }, [
    {
      $set: {
        planHistory: {
          $cond: [
            { $eq: [{ $ifNull: ["$plan", null] }, null] },
            "$planHistory",
            {
              $concatArrays: [
                { $ifNull: ["$planHistory", []] },
                [
                  {
                    startDate: "$plan.startDate",
                    plannedDays: "$plan.plannedDays",
                    plannedHours: { $ifNull: ["$plan.plannedHours", null] },
                    changedAt: { $literal: new Date() },
                    changedBy: new mongoose.Types.ObjectId(String(actor.id)),
                  },
                ],
              ],
            },
          ],
        },
      },
    },
    { $set: { plan: { $literal: plan } } },
  ]);
  if (updated.matchedCount === 0) throw projectNotFound();
  return loadItem(actor, projectId);
}

/** P5 — idempotent; tasks and lines are untouched (database_schema.md §7.1). */
export async function deactivateProject(actor, projectId) {
  const updated = await Project.updateOne(
    { _id: projectId },
    { $set: { status: "inactive" } },
  );
  if (updated.matchedCount === 0) throw projectNotFound();
  return loadItem(actor, projectId);
}
