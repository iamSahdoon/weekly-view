import * as projectService from "../services/projectService.js";
import { ok } from "../utils/apiResponse.js";

const actorOf = (req) => ({
  id: req.user._id,
  role: req.user.role,
  isOwner: !!req.user.isOwner,
});

export const list = async (req, res) =>
  ok(res, await projectService.listProjects(actorOf(req), req.validated.query));

export const create = async (req, res) =>
  ok(
    res,
    await projectService.createProject(actorOf(req), req.validated.body),
    null,
    201,
  );

export const update = async (req, res) =>
  ok(
    res,
    await projectService.updateProject(
      actorOf(req),
      req.validated.params.id,
      req.validated.body,
    ),
  );

export const setPlan = async (req, res) =>
  ok(
    res,
    await projectService.setPlan(
      actorOf(req),
      req.validated.params.id,
      req.validated.body,
    ),
  );

export const deactivate = async (req, res) =>
  ok(
    res,
    await projectService.deactivateProject(
      actorOf(req),
      req.validated.params.id,
    ),
  );
