import { Router } from "express";
import { markSeen } from "../controllers/markerController.js";
import * as reports from "../controllers/reportController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import * as schemas from "../validators/reportValidator.js";

// R1–R11, R13. /summary and /week/:weekKey… are declared before /:id. Guards attach per
// route, never router.use: reviewRoutes shares /reports (api_specification.md §1.1).
const router = Router();

router.get(
  "/",
  validate(schemas.listReportsSchema),
  authenticate,
  reports.listMine,
);
router.get(
  "/summary",
  validate(schemas.summarySchema),
  authenticate,
  reports.summary,
);
router.get(
  "/week/:weekKey",
  validate(schemas.myWeekSchema),
  authenticate,
  reports.myWeek,
);
router.put(
  "/week/:weekKey/days/:weekday",
  validate(schemas.putDaySchema),
  authenticate,
  reports.putDay,
);
router.get(
  "/:id",
  validate(schemas.reportIdSchema),
  authenticate,
  reports.getOne,
);
router.patch(
  "/:id",
  validate(schemas.autosaveSchema),
  authenticate,
  reports.autosave,
);
router.post(
  "/:id/submit",
  validate(schemas.submitSchema),
  authenticate,
  reports.submit,
);
router.get(
  "/:id/revisions",
  validate(schemas.reportIdSchema),
  authenticate,
  reports.revisions,
);
router.get(
  "/:id/revisions/:revisionNumber",
  validate(schemas.revisionSchema),
  authenticate,
  reports.revision,
);
router.put(
  "/:id/blockers/:blockerId/resolution",
  validate(schemas.resolutionSchema),
  authenticate,
  reports.resolve,
);
router.delete(
  "/:id/blockers/:blockerId/resolution",
  validate(schemas.resolutionSchema),
  authenticate,
  reports.unresolve,
);
router.put(
  "/:id/days/:weekday/team-comments",
  validate(schemas.teamCommentsSchema),
  authenticate,
  reports.teamComments,
);
router.post(
  "/:id/seen",
  validate(schemas.reportIdSchema),
  authenticate,
  markSeen,
);

export default router;
