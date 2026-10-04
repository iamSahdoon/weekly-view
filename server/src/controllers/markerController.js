import * as markerService from "../services/markerService.js";
import { ok } from "../utils/apiResponse.js";

// R13 (S4); N1 arrives with S5.

const actorOf = (req) => ({
  id: req.user._id,
  role: req.user.role,
  isOwner: !!req.user.isOwner,
});

export const markSeen = async (req, res) =>
  ok(res, await markerService.markSeen(actorOf(req), req.validated.params.id));
