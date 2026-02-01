import { Router } from "express";
import { RoleController as ctrl } from "./roles.controller.js";
import { requirePermission } from "@/middlewares/require-premission.middleware.js";
// src/modules/rbac/roles/role.routes.ts
export const RolesRouter = Router();
/**
 * Role routes
 * - Access control: use permission keys like "role.read", "role.write"
 * - We use resource/action style to match your design
 */
RolesRouter.post("/", requirePermission("Role", "write"), ctrl.create);
RolesRouter.get("/", requirePermission("Role", "read"), ctrl.list);
RolesRouter.get("/:id", requirePermission("Role", "read"), ctrl.get);
RolesRouter.put("/:id", requirePermission("Role", "write"), ctrl.update);
RolesRouter.delete("/:id", requirePermission("Role", "delete"), ctrl.remove);
// role permissions management
RolesRouter.post("/:id/permissions", requirePermission("Role", "write"), ctrl.assignPermission);
RolesRouter.delete("/:id/permissions/:permId", requirePermission("Role", "write"), ctrl.removePermission);
RolesRouter.get("/:id/permissions", requirePermission("Role", "read"), ctrl.getPermissions);
// user-role endpoints (could be moved to /users or a separate submodule)
RolesRouter.post("/assign-to-user", requirePermission("Role", "write"), ctrl.assignRoleToUser);
RolesRouter.delete("/user/:userId/role/:roleId", requirePermission("Role", "write"), ctrl.removeRoleFromUser);
export default RolesRouter;
//# sourceMappingURL=roles.route.js.map