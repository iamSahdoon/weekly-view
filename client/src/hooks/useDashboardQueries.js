import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { qk } from "../lib/queryKeys.js";
import * as dashboardService from "../services/dashboardService.js";

// Dashboard hooks (frontend_architecture.md §5.6, §9.8): one per block, so each block is
// its own query and fails on its own. `params` are the block's API params from
// lib/dashboardParams; the week is in them and in the key. The team table keeps its
// previous page while a filter changes (§5.5); the rest keep theirs too, so a chart
// eases from one week to the next instead of flashing a skeleton.

const keep = { placeholderData: keepPreviousData };

/** D1 — the metric strip. */
export const useDashboardSummary = (params) =>
  useQuery({
    queryKey: qk.dashboard.summary(params.weekKey, params),
    queryFn: () => dashboardService.getSummary(params),
    ...keep,
  });

/** D2 — the team table. */
export const useDashboardTeam = (params) =>
  useQuery({
    queryKey: qk.dashboard.team(params.weekKey, params),
    queryFn: () => dashboardService.getTeam(params),
    ...keep,
  });

/** D8 — the projects table. */
export const useDashboardProjects = (params) =>
  useQuery({
    queryKey: qk.dashboard.projects(params.weekKey, params),
    queryFn: () => dashboardService.getProjects(params),
    ...keep,
  });

/** D3 — Done tasks per week. Its key is the window's last week. */
export const useDashboardTrend = (params) =>
  useQuery({
    queryKey: qk.dashboard.trend(params.endWeek, params),
    queryFn: () => dashboardService.getTrend(params),
    ...keep,
  });

/** D4 — time by task type. */
export const useDashboardHours = (params) =>
  useQuery({
    queryKey: qk.dashboard.hours(params.weekKey, params),
    queryFn: () => dashboardService.getHours(params),
    ...keep,
  });

/** D5 — workload by project. */
export const useDashboardWorkload = (params) =>
  useQuery({
    queryKey: qk.dashboard.workload(params.weekKey, params),
    queryFn: () => dashboardService.getWorkload(params),
    ...keep,
  });

/** D6 — the latest eight events; not week-scoped, so no params. */
export const useRecentActivity = () =>
  useQuery({
    queryKey: qk.dashboard.activity(),
    queryFn: dashboardService.getActivity,
  });

/** D7 — the person profile's metric strip. */
export const usePersonMetrics = (userId) =>
  useQuery({
    queryKey: qk.dashboard.person(userId),
    queryFn: () => dashboardService.getPersonMetrics(userId),
  });
