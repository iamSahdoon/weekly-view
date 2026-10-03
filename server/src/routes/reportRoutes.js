import { Router } from "express";

// R1–R11, R13 — Stage S4. /summary and /week/:weekKey… are declared before /:id. Guards attach per route (api_specification.md §1.1).
const router = Router();

export default router;
