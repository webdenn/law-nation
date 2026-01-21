import { Router } from "express";
import { requireAuth } from "@/middlewares/auth.middleware.js";
import { requirePermission } from "@/middlewares/require-premission.middleware.js";
import { AdminEditorController } from "./controllers/admin-editor.controller.js";
import { validateRequest } from "./middlewares/validation.middleware.js";
import {
  createEditorSchema,
  updateEditorSchema,
  getEditorByIdSchema,
  deleteEditorSchema,
  assignArticleToEditorSchema,
  getEditorStatsSchema,
  getEditorWorkloadSchema
} from "./validators/admin-editor.validator.js";

const router = Router();
const adminEditorController = new AdminEditorController();

// All admin editor routes require authentication and admin permission
router.use(requireAuth);
router.use(requirePermission("admin", "read"));

// Editor management routes
router.get(
  "/",
  adminEditorController.getAllEditors.bind(adminEditorController)
);

router.get(
  "/:id",
  validateRequest(getEditorByIdSchema),
  adminEditorController.getEditorById.bind(adminEditorController)
);

router.post(
  "/",
  requirePermission("admin", "write"),
  validateRequest(createEditorSchema),
  adminEditorController.createEditor.bind(adminEditorController)
);

router.put(
  "/:id",
  requirePermission("admin", "write"),
  validateRequest(updateEditorSchema),
  adminEditorController.updateEditor.bind(adminEditorController)
);

router.delete(
  "/:id",
  requirePermission("admin", "write"),
  validateRequest(deleteEditorSchema),
  adminEditorController.deleteEditor.bind(adminEditorController)
);

// Editor statistics and workload
router.get(
  "/:id/stats",
  validateRequest(getEditorStatsSchema),
  adminEditorController.getEditorStats.bind(adminEditorController)
);

router.get(
  "/:id/workload",
  validateRequest(getEditorWorkloadSchema),
  adminEditorController.getEditorWorkload.bind(adminEditorController)
);

// Article assignment
router.post(
  "/:id/assign",
  requirePermission("admin", "write"),
  validateRequest(assignArticleToEditorSchema),
  adminEditorController.assignArticleToEditor.bind(adminEditorController)
);

export default router;