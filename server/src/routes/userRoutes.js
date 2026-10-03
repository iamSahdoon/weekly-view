import { Router } from "express";

// U1–U13 — Stage S2 (U7, U8 in S4). /on-leave is declared before /:userId. Guards attach per route (api_specification.md §1.1).
const router = Router();

export default router;
