import * as authService from "../services/authService.js";
import { ok } from "../utils/apiResponse.js";

const actorOf = (req) => ({
  id: req.user._id,
  role: req.user.role,
  isOwner: !!req.user.isOwner,
});

export const bootstrap = async (req, res) =>
  ok(res, await authService.bootstrapStatus());

export const signup = async (req, res) =>
  ok(res, await authService.signup(req.validated.body), null, 201);

export const login = async (req, res) =>
  ok(res, await authService.login(req.validated.body));

export const me = async (req, res) =>
  ok(res, await authService.getMe(actorOf(req)));

export const updateMe = async (req, res) =>
  ok(res, await authService.updateMe(actorOf(req), req.validated.body));

export const changePassword = async (req, res) =>
  ok(res, await authService.changePassword(actorOf(req), req.validated.body));

export const previewLink = async (req, res) =>
  ok(res, await authService.previewLink(req.validated.body));

export const acceptLink = async (req, res) =>
  ok(res, await authService.acceptLink(req.validated.body), null, 201);
