import * as reportService from "../services/reportService.js";
import { ok } from "../utils/apiResponse.js";

// R1–R12, plus U7 and U8, which are mounted on /users but read reports
// (api_specification.md §2.2, §2.5).

const actorOf = (req) => ({
  id: req.user._id,
  role: req.user.role,
  isOwner: !!req.user.isOwner,
});

export const listMine = async (req, res) =>
  ok(res, await reportService.listMyReports(actorOf(req), req.validated.query));

export const summary = async (req, res) =>
  ok(res, await reportService.summary(actorOf(req), req.validated.query));

export const myWeek = async (req, res) =>
  ok(
    res,
    await reportService.getMyWeek(actorOf(req), req.validated.params.weekKey),
  );

export const putDay = async (req, res) => {
  const { weekKey, weekday } = req.validated.params;
  return ok(
    res,
    await reportService.putDay(
      actorOf(req),
      weekKey,
      weekday,
      req.validated.body,
    ),
  );
};

export const getOne = async (req, res) =>
  ok(res, await reportService.getReport(actorOf(req), req.validated.params.id));

export const autosave = async (req, res) =>
  ok(
    res,
    await reportService.autosave(
      actorOf(req),
      req.validated.params.id,
      req.validated.body,
    ),
  );

export const submit = async (req, res) =>
  ok(
    res,
    await reportService.submit(
      actorOf(req),
      req.validated.params.id,
      req.validated.body,
    ),
  );

export const revisions = async (req, res) =>
  ok(
    res,
    await reportService.listRevisions(actorOf(req), req.validated.params.id),
  );

export const revision = async (req, res) => {
  const { id, revisionNumber } = req.validated.params;
  return ok(
    res,
    await reportService.getRevision(actorOf(req), id, revisionNumber),
  );
};

export const resolve = async (req, res) => {
  const { id, blockerId } = req.validated.params;
  return ok(
    res,
    await reportService.setResolution(actorOf(req), id, blockerId, true),
  );
};

export const unresolve = async (req, res) => {
  const { id, blockerId } = req.validated.params;
  return ok(
    res,
    await reportService.setResolution(actorOf(req), id, blockerId, false),
  );
};

export const teamComments = async (req, res) => {
  const { id, weekday } = req.validated.params;
  return ok(
    res,
    await reportService.setTeamComments(
      actorOf(req),
      id,
      weekday,
      req.validated.body.open,
    ),
  );
};

export const updates = async (req, res) =>
  ok(res, await reportService.teamUpdates(actorOf(req), req.validated.query));

export const userReports = async (req, res) =>
  ok(
    res,
    await reportService.listUserReports(
      actorOf(req),
      req.validated.params.userId,
      req.validated.query,
    ),
  );

export const userWeek = async (req, res) => {
  const { userId, weekKey } = req.validated.params;
  return ok(
    res,
    await reportService.getUserWeek(actorOf(req), userId, weekKey),
  );
};
