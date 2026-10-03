import { Router } from "express";
import { ok } from "../utils/apiResponse.js";
import authRoutes from "./authRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import holidayRoutes from "./holidayRoutes.js";
import meRoutes from "./meRoutes.js";
import projectRoutes from "./projectRoutes.js";
import reportRoutes from "./reportRoutes.js";
import reviewRoutes, { reviewDeskRoutes } from "./reviewRoutes.js";
import taskRoutes from "./taskRoutes.js";
import updateRoutes from "./updateRoutes.js";
import userRoutes from "./userRoutes.js";

// The API's table of contents — api_specification.md §1.1. Mounted once at /api by app.js.
const router = Router();

// H1. Public; never touches the database, so a slow Atlas never fails Render's check.
const healthHandler = (req, res) => ok(res, { status: "ok" });

router.get("/health", healthHandler);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/projects", projectRoutes);
router.use("/tasks", taskRoutes);
router.use("/updates", updateRoutes); // the team updates feed
router.use("/reports", reportRoutes); // author side, days, resolutions
router.use("/reports", reviewRoutes); // review actions and comments
router.use("/review-desk", reviewDeskRoutes); // exported from reviewRoutes.js
router.use("/holidays", holidayRoutes);
router.use("/me", meRoutes); // "new" markers
router.use("/dashboard", dashboardRoutes);

export default router;
