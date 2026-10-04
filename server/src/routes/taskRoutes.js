import { Router } from "express";
import * as tasks from "../controllers/taskController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { listTasksSchema } from "../validators/taskValidator.js";

// T1. Tasks are created by R5, never here. Guards attach per route
// (api_specification.md §1.1).
const router = Router();

router.get("/", validate(listTasksSchema), authenticate, tasks.list);

export default router;
