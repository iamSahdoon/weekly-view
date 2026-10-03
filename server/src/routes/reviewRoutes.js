import { Router } from "express";

// C1–C5 and V1–V2, mounted at /reports beside reportRoutes; V3–V4 on reviewDeskRoutes,
// mounted at /review-desk — Stage S5. Both routers share /reports with reportRoutes, so
// guards attach per route, never with router.use (project_structure.md §2.4).
const router = Router();

export const reviewDeskRoutes = Router();

export default router;
