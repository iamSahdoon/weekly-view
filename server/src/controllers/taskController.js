import * as taskService from "../services/taskService.js";
import { ok } from "../utils/apiResponse.js";

const actorOf = (req) => ({
  id: req.user._id,
  role: req.user.role,
  isOwner: !!req.user.isOwner,
});

export const list = async (req, res) =>
  ok(res, await taskService.listTasks(actorOf(req), req.validated.query));
