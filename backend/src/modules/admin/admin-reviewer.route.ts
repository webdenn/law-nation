import { Router } from "express";
import { requireAuth } from "@/middlewares/auth.middleware.js";
import { requirePermission } from "@/middlewares/require-premission.middleware.js";
import { AdminReviewerController } from "./controllers/admin-reviewer.controller.js";
import { validateRequest } from "./middlewares/validation.middleware.js";
import {
  createReviewerSchema,
  updateReviewerSchema,
  getReviewerByIdSchema,
  deleteReviewerSchema,
  assignArticleToReviewerSchema,
  getReviewerStatsSchema,
  getReviewerWorkloadSchema
} from "./validators/admin-reviewer.validator.js";

const router = Router();
const adminReviewerController = new AdminReviewerController();

// All admin reviewer routes require authentication and admin permission
router.use(requireAuth);
router.use(requirePermission("admin", "read"));

// Reviewer management routes
router.get(
  "/",
  adminReviewerController.getAllReviewers.bind(adminReviewerController)
);

router.get(
  "/:id",
  validateRequest(getReviewerByIdSchema),
  adminReviewerController.getReviewerById.bind(adminReviewerController)
);

router.post(
  "/",
  requirePermission("admin", "write"),
  validateRequest(createReviewerSchema),
  adminReviewerController.createReviewer.bind(adminReviewerController)
);

router.put(
  "/:id",
  requirePermission("admin", "write"),
  validateRequest(updateReviewerSchema),
  adminReviewerController.updateReviewer.bind(adminReviewerController)
);

router.delete(
  "/:id",
  requirePermission("admin", "write"),
  validateRequest(deleteReviewerSchema),
  adminReviewerController.deleteReviewer.bind(adminReviewerController)
);

// Reviewer statistics and workload
router.get(
  "/:id/stats",
  validateRequest(getReviewerStatsSchema),
  adminReviewerController.getReviewerStats.bind(adminReviewerController)
);

router.get(
  "/:id/workload",
  validateRequest(getReviewerWorkloadSchema),
  adminReviewerController.getReviewerWorkload.bind(adminReviewerController)
);

// Article assignment
router.post(
  "/:id/assign",
  requirePermission("admin", "write"),
  validateRequest(assignArticleToReviewerSchema),
  adminReviewerController.assignArticleToReviewer.bind(adminReviewerController)
);

export default router;