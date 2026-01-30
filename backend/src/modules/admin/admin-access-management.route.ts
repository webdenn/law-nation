import { Router } from "express";
import { requireAuth } from "@/middlewares/auth.middleware.js";
import { requirePermission } from "@/middlewares/require-premission.middleware.js";
import { AdminAccessManagementController } from "./controllers/admin-access-management.controller.js";
import { validateRequest } from "./middlewares/validation.middleware.js";
import {
  removeAccessSchema,
  getEditorsListSchema,
  getReviewersListSchema,
  getUserAccessHistorySchema
} from "./validators/admin-access-management.validator.js";

const router = Router();
const accessManagementController = new AdminAccessManagementController();

// All access management routes require authentication and admin permission
router.use(requireAuth);
router.use(requirePermission("admin", "read"));

// Get access management statistics
router.get(
  "/stats",
  accessManagementController.getAccessManagementStats.bind(accessManagementController)
);

// Get editors list for access management
router.get(
  "/editors",
  validateRequest(getEditorsListSchema),
  accessManagementController.getEditorsList.bind(accessManagementController)
);

// Get reviewers list for access management
router.get(
  "/reviewers",
  validateRequest(getReviewersListSchema),
  accessManagementController.getReviewersList.bind(accessManagementController)
);

// Remove user access (requires write permission)
router.delete(
  "/remove-access",
  requirePermission("admin", "write"),
  validateRequest(removeAccessSchema),
  accessManagementController.removeUserAccess.bind(accessManagementController)
);

// Get user access history
router.get(
  "/history/:userId",
  validateRequest(getUserAccessHistorySchema),
  accessManagementController.getUserAccessHistory.bind(accessManagementController)
);

export default router;