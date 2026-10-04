import { Router } from "express";
import * as projects from "../controllers/projectController.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import * as schemas from "../validators/projectValidator.js";

// P1–P5. Guards attach per route (api_specification.md §1.1).
const router = Router();

const manager = [authenticate, authorize("manager")];

router.get(
  "/",
  validate(schemas.listProjectsSchema),
  authenticate,
  projects.list,
);
router.post(
  "/",
  validate(schemas.createProjectSchema),
  ...manager,
  projects.create,
);
router.patch(
  "/:id",
  validate(schemas.updateProjectSchema),
  ...manager,
  projects.update,
);
router.put(
  "/:id/plan",
  validate(schemas.planSchema),
  ...manager,
  projects.setPlan,
);
router.post(
  "/:id/deactivate",
  validate(schemas.projectIdSchema),
  ...manager,
  projects.deactivate,
);

export default router;
