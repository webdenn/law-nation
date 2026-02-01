import { Router } from "express";
import { PermissionController } from "./permissions.controller.js";
import { requirePermission } from "@/middlewares/require-premission.middleware.js";

// src/modules/rbac/permissions/permission.routes.ts

export const PermissionRouter: Router = Router();

/**
 * Permission routes:
 * - protected by "Permission" resource permissions (e.g., Permission.read / Permission.write)
 * - You can choose a different resource name like "Permission" or "permissions" for consistency
 */

PermissionRouter.post(
  "/",
  requirePermission("Permission", "write"),
  PermissionController.create
);

PermissionRouter.get(
  "/",
  requirePermission("Permission", "read"),
  PermissionController.list
);

PermissionRouter.get(
  "/:id",
  requirePermission("Permission", "read"),
  PermissionController.get
);

PermissionRouter.put(
  "/:id",
  requirePermission("Permission", "write"),
  PermissionController.update
);

PermissionRouter.delete(
  "/:id",
  requirePermission("Permission", "delete"),
  PermissionController.remove
);

export default PermissionRouter;


