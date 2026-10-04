import * as dashboardService from "../services/dashboardService.js";
import { ok } from "../utils/apiResponse.js";

// D1–D8 (api_specification.md §2.9). Every dashboard read is manager-only and the same
// for every manager, so there is no actor to build.

export const summary = async (req, res) =>
  ok(res, await dashboardService.summary(req.validated.query));

export const team = async (req, res) =>
  ok(res, await dashboardService.team(req.validated.query));

export const trend = async (req, res) =>
  ok(res, await dashboardService.trend(req.validated.query));

export const hours = async (req, res) =>
  ok(res, await dashboardService.hours(req.validated.query));

export const workload = async (req, res) =>
  ok(res, await dashboardService.workload(req.validated.query));

export const activity = async (req, res) =>
  ok(res, await dashboardService.activity());

export const personMetrics = async (req, res) =>
  ok(res, await dashboardService.personMetrics(req.validated.params.userId));

export const projects = async (req, res) =>
  ok(res, await dashboardService.projects(req.validated.query));
