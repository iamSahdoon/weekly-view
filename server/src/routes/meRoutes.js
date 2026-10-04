import { Router } from "express";
import { newMarks } from "../controllers/markerController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { newMarksSchema } from "../validators/reportValidator.js";

// N1. Guards attach per route (api_specification.md §1.1).
const router = Router();

router.get("/new", validate(newMarksSchema), authenticate, newMarks);

export default router;
