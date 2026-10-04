import { Router } from "express";
import * as reports from "../controllers/reportController.js";
import * as users from "../controllers/userController.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import {
  userReportsSchema,
  userWeekSchema,
} from "../validators/reportValidator.js";
import * as schemas from "../validators/userValidator.js";

// U1–U13. /on-leave is declared before /:userId. U7 and U8 read reports, so their
// handlers are reportController's. Guards attach per route (api_specification.md §1.1).
const router = Router();

const manager = [authenticate, authorize("manager")];
const admin = [authenticate, authorize("admin")];

router.get("/", validate(schemas.listUsersSchema), ...manager, users.list);
router.post("/", validate(schemas.inviteSchema), ...admin, users.invite);
router.get(
  "/on-leave",
  validate(schemas.onLeaveSchema),
  authenticate,
  users.onLeave,
);
router.get(
  "/:userId",
  validate(schemas.userIdSchema),
  ...manager,
  users.getOne,
);
router.post(
  "/:userId/invite-link",
  validate(schemas.userIdSchema),
  ...admin,
  users.reissueInvite,
);
router.patch(
  "/:userId/role",
  validate(schemas.roleSchema),
  ...admin,
  users.changeRole,
);
router.post(
  "/:userId/remove",
  validate(schemas.userIdSchema),
  ...admin,
  users.remove,
);
router.get(
  "/:userId/reports",
  validate(userReportsSchema),
  ...manager,
  reports.userReports,
);
router.get(
  "/:userId/reports/:weekKey",
  validate(userWeekSchema),
  authenticate,
  reports.userWeek,
);
router.put(
  "/:userId/leave",
  validate(schemas.leaveSchema),
  authenticate,
  users.setLeave,
);
router.post(
  "/:userId/transfer-ownership",
  validate(schemas.userIdSchema),
  ...admin,
  users.transferOwnership,
);
router.patch(
  "/:userId/email",
  validate(schemas.emailSchema),
  ...admin,
  users.changeEmail,
);
router.post(
  "/:userId/reset-link",
  validate(schemas.userIdSchema),
  ...admin,
  users.resetLink,
);

export default router;
