import * as userService from "../services/userService.js";
import { ok } from "../utils/apiResponse.js";

// U7 and U8 are mounted on /users but read reports: their handlers live in
// reportController (api_specification.md §2.2).

const actorOf = (req) => ({
  id: req.user._id,
  role: req.user.role,
  isOwner: !!req.user.isOwner,
});

export const list = async (req, res) =>
  ok(res, await userService.listUsers(actorOf(req), req.validated.query));

export const onLeave = async (req, res) =>
  ok(res, await userService.listOnLeave(actorOf(req)));

export const getOne = async (req, res) =>
  ok(res, await userService.getUser(actorOf(req), req.validated.params.userId));

export const invite = async (req, res) => {
  const { created, ...data } = await userService.invite(
    actorOf(req),
    req.validated.body,
  );
  return ok(res, data, null, created ? 201 : 200);
};

export const reissueInvite = async (req, res) =>
  ok(
    res,
    await userService.reissueInvite(actorOf(req), req.validated.params.userId),
  );

export const changeRole = async (req, res) =>
  ok(
    res,
    await userService.changeRole(
      actorOf(req),
      req.validated.params.userId,
      req.validated.body.role,
    ),
  );

export const remove = async (req, res) =>
  ok(
    res,
    await userService.removeUser(actorOf(req), req.validated.params.userId),
  );

export const setLeave = async (req, res) =>
  ok(
    res,
    await userService.setLeave(
      actorOf(req),
      req.validated.params.userId,
      req.validated.body.onLeave,
    ),
  );

export const transferOwnership = async (req, res) =>
  ok(
    res,
    await userService.transferOwnership(
      actorOf(req),
      req.validated.params.userId,
    ),
  );

export const changeEmail = async (req, res) =>
  ok(
    res,
    await userService.changeEmail(
      actorOf(req),
      req.validated.params.userId,
      req.validated.body.email,
    ),
  );

export const resetLink = async (req, res) =>
  ok(
    res,
    await userService.issueResetLink(actorOf(req), req.validated.params.userId),
  );
