import { Router } from "express";
import * as dashboard from "../controllers/dashboardController.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import * as schemas from "../validators/dashboardValidator.js";

// D1–D8 — api_specification.md §2.9. Guards attach per route (§1.1); every route is
// manager-only.
const router = Router();

const manager = [authenticate, authorize("manager")];

router.get(
  "/summary",
  validate(schemas.summarySchema),
  ...manager,
  dashboard.summary,
);
router.get("/team", validate(schemas.teamSchema), ...manager, dashboard.team);
router.get(
  "/trend",
  validate(schemas.trendSchema),
  ...manager,
  dashboard.trend,
);
router.get(
  "/hours",
  validate(schemas.weekScopedSchema),
  ...manager,
  dashboard.hours,
);
router.get(
  "/workload",
  validate(schemas.weekScopedSchema),
  ...manager,
  dashboard.workload,
);
router.get(
  "/activity",
  validate(schemas.activitySchema),
  ...manager,
  dashboard.activity,
);
router.get(
  "/people/:userId",
  validate(schemas.personMetricsSchema),
  ...manager,
  dashboard.personMetrics,
);
router.get(
  "/projects",
  validate(schemas.projectsSchema),
  ...manager,
  dashboard.projects,
);

export default router;
