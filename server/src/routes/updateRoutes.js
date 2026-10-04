import { Router } from "express";
import * as reports from "../controllers/reportController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { updatesSchema } from "../validators/reportValidator.js";

// R12, the team updates feed. Guards attach per route (api_specification.md §1.1).
const router = Router();

router.get("/", validate(updatesSchema), authenticate, reports.updates);

export default router;
