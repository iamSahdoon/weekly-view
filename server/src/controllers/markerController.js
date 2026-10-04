import * as markerService from "../services/markerService.js";
import { ok } from "../utils/apiResponse.js";

// R13 and N1.

const actorOf = (req) => ({
  id: req.user._id,
  role: req.user.role,
  isOwner: !!req.user.isOwner,
});

export const markSeen = async (req, res) =>
  ok(res, await markerService.markSeen(actorOf(req), req.validated.params.id));

export const newMarks = async (req, res) =>
  ok(res, await markerService.newMarks(actorOf(req)));
