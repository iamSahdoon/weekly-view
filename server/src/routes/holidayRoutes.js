import { Router } from "express";
import * as holidays from "../controllers/holidayController.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import * as schemas from "../validators/holidayValidator.js";

// HD1–HD4. Guards attach per route (api_specification.md §1.1).
const router = Router();

const admin = [authenticate, authorize("admin")];

router.get(
  "/",
  validate(schemas.listHolidaysSchema),
  authenticate,
  holidays.list,
);
router.post(
  "/",
  validate(schemas.createHolidaySchema),
  ...admin,
  holidays.create,
);
router.patch(
  "/:id",
  validate(schemas.updateHolidaySchema),
  ...admin,
  holidays.update,
);
router.delete(
  "/:id",
  validate(schemas.holidayIdSchema),
  ...admin,
  holidays.remove,
);

export default router;
