import { Router } from "express";
import { requireAuth } from "@/middlewares/auth.middleware.js";
import { requirePermission } from "@/middlewares/require-premission.middleware.js";
import { adminDashboardController } from "./admin-dashboard.controller.js";
import { AdminArticleVisibilityController } from "./controllers/admin-article-visibility.controller.js";
import { validateRequest } from "./middlewares/validation.middleware.js";
import { toggleVisibilitySchema, getHiddenArticlesSchema } from "./validators/admin-article-visibility.validator.js";

const router = Router();
const visibilityController = new AdminArticleVisibilityController();

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

// Article visibility management routes
router.patch(
  "/articles/:id/visibility",
  requirePermission("article", "update"),
  validateRequest(toggleVisibilitySchema),
  visibilityController.toggleVisibility
);

router.get(
  "/articles/visibility/stats",
  visibilityController.getVisibilityStats
);

router.get(
  "/articles/hidden",
  validateRequest(getHiddenArticlesSchema),
  visibilityController.getHiddenArticles
);

export default router;
