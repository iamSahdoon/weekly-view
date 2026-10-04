import * as reviewService from "../services/reviewService.js";
import { ok } from "../utils/apiResponse.js";

// C1–C5 and V1–V4 (api_specification.md §2.6, §2.7).

const actorOf = (req) => ({
  id: req.user._id,
  role: req.user.role,
  isOwner: !!req.user.isOwner,
});

export const commentOnDay = async (req, res) => {
  const { id, weekday } = req.validated.params;
  const day = await reviewService.commentOnDay(
    actorOf(req),
    id,
    weekday,
    req.validated.body,
  );
  return ok(res, day, null, 201);
};

export const commentOnWeek = async (req, res) =>
  ok(
    res,
    await reviewService.commentOnWeek(
      actorOf(req),
      req.validated.params.id,
      req.validated.body,
    ),
    null,
    201,
  );

export const reply = async (req, res) => {
  const { id, threadId } = req.validated.params;
  const thread = await reviewService.reply(
    actorOf(req),
    id,
    threadId,
    req.validated.body,
  );
  return ok(res, thread, null, 201);
};

export const editComment = async (req, res) => {
  const { id, threadId, replyId = null } = req.validated.params;
  return ok(
    res,
    await reviewService.editComment(
      actorOf(req),
      id,
      threadId,
      replyId,
      req.validated.body,
    ),
  );
};

export const deleteComment = async (req, res) => {
  const { id, threadId, replyId = null } = req.validated.params;
  return ok(
    res,
    await reviewService.deleteComment(actorOf(req), id, threadId, replyId),
  );
};

export const approve = async (req, res) =>
  ok(
    res,
    await reviewService.approve(
      actorOf(req),
      req.validated.params.id,
      req.validated.body,
    ),
  );

export const sendBack = async (req, res) =>
  ok(
    res,
    await reviewService.sendBack(
      actorOf(req),
      req.validated.params.id,
      req.validated.body,
    ),
  );

export const reviewDesk = async (req, res) =>
  ok(res, await reviewService.reviewDesk(actorOf(req), req.validated.query));

export const reviewDeskCount = async (req, res) =>
  ok(res, await reviewService.reviewDeskCount(actorOf(req)));
