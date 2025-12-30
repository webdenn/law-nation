import { Router } from "express";
import { requireAuth } from "@/middlewares/auth.middleware.js";
import { requirePermission } from "@/middlewares/require-premission.middleware.js";
import { adminDashboardController } from "./admin-dashboard.controller.js";

const router = Router();

// All admin dashboard routes require authentication and admin permission
router.use(requireAuth);
router.use(requirePermission("admin", "read"));

// Get overall summary
router.get(
  "/summary",
  adminDashboardController.getSummary.bind(adminDashboardController)
);

// Get time metrics
router.get(
  "/time-metrics",
  adminDashboardController.getTimeMetrics.bind(adminDashboardController)
);

// Get status distribution
router.get(
  "/status-distribution",
  adminDashboardController.getStatusDistribution.bind(adminDashboardController)
);

// Get articles timeline
router.get(
  "/articles-timeline",
  adminDashboardController.getArticlesTimeline.bind(adminDashboardController)
);

export default router;
