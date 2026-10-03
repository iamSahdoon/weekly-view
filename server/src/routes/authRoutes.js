import { Router } from "express";
import * as auth from "../controllers/authController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import * as schemas from "../validators/authValidator.js";

// A1–A8. Guards attach per route (api_specification.md §1.1). Public: A1–A3, A7, A8.
const router = Router();

router.get("/bootstrap", validate(schemas.bootstrapSchema), auth.bootstrap);
router.post("/signup", validate(schemas.signupSchema), auth.signup);
router.post("/login", validate(schemas.loginSchema), auth.login);
router.get("/me", validate(schemas.meSchema), authenticate, auth.me);
router.patch(
  "/me",
  validate(schemas.updateMeSchema),
  authenticate,
  auth.updateMe,
);
router.post(
  "/password",
  validate(schemas.changePasswordSchema),
  authenticate,
  auth.changePassword,
);
router.post(
  "/links/preview",
  validate(schemas.linkPreviewSchema),
  auth.previewLink,
);
router.post(
  "/links/accept",
  validate(schemas.linkAcceptSchema),
  auth.acceptLink,
);

export default router;
