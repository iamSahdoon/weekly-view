import { Router } from "express";
import * as review from "../controllers/reviewController.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import * as schemas from "../validators/reviewValidator.js";

// C1–C5 and V1–V2, mounted at /reports beside reportRoutes; V3–V4 on reviewDeskRoutes,
// mounted at /review-desk. Both routers share /reports with reportRoutes, so guards attach
// per route, never with router.use (project_structure.md §2.4).
const router = Router();

const manager = [authenticate, authorize("manager")];

router.post(
  "/:id/days/:weekday/comments",
  validate(schemas.dayCommentSchema),
  authenticate,
  review.commentOnDay,
);
router.post(
  "/:id/week-comments",
  validate(schemas.weekCommentSchema),
  ...manager,
  review.commentOnWeek,
);
router.post(
  "/:id/threads/:threadId/replies",
  validate(schemas.replySchema),
  authenticate,
  review.reply,
);
router.patch(
  "/:id/threads/:threadId",
  validate(schemas.editThreadSchema),
  authenticate,
  review.editComment,
);
router.patch(
  "/:id/threads/:threadId/replies/:replyId",
  validate(schemas.editReplySchema),
  authenticate,
  review.editComment,
);
router.delete(
  "/:id/threads/:threadId",
  validate(schemas.deleteThreadSchema),
  authenticate,
  review.deleteComment,
);
router.delete(
  "/:id/threads/:threadId/replies/:replyId",
  validate(schemas.deleteReplySchema),
  authenticate,
  review.deleteComment,
);
router.post(
  "/:id/review/approve",
  validate(schemas.approveSchema),
  ...manager,
  review.approve,
);
router.post(
  "/:id/review/send-back",
  validate(schemas.sendBackSchema),
  ...manager,
  review.sendBack,
);

export const reviewDeskRoutes = Router();

reviewDeskRoutes.get(
  "/",
  validate(schemas.reviewDeskSchema),
  ...manager,
  review.reviewDesk,
);
reviewDeskRoutes.get(
  "/count",
  validate(schemas.reviewDeskCountSchema),
  ...manager,
  review.reviewDeskCount,
);

export default router;
