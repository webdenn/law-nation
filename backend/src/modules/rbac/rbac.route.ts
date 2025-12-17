import { Router } from "express";
import RolesRouter from "./roles/roles.route.js";
import { PermissionRouter } from "./permissions/permissions.route.js";

// src/modules/rbac/rbac.routes.ts
export const RbacRouter: Router = Router();

// Mount submodules under /roles and /permissions
RbacRouter.use("/roles", RolesRouter);
RbacRouter.use("/permissions", PermissionRouter);

// Optionally: expose other convenience endpoints here later (e.g., resources, user-roles)
export default RbacRouter;
