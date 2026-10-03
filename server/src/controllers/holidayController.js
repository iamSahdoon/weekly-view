import * as holidayService from "../services/holidayService.js";
import { ok } from "../utils/apiResponse.js";

const actorOf = (req) => ({
  id: req.user._id,
  role: req.user.role,
  isOwner: !!req.user.isOwner,
});

export const list = async (req, res) =>
  ok(res, await holidayService.listHolidays(actorOf(req), req.validated.query));

export const create = async (req, res) =>
  ok(
    res,
    await holidayService.createHoliday(actorOf(req), req.validated.body),
    null,
    201,
  );

export const update = async (req, res) =>
  ok(
    res,
    await holidayService.updateHoliday(
      actorOf(req),
      req.validated.params.id,
      req.validated.body,
    ),
  );

export const remove = async (req, res) =>
  ok(
    res,
    await holidayService.deleteHoliday(actorOf(req), req.validated.params.id),
  );
