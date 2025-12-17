import { Router } from "express";
import { UserController } from "./user.controller.js";
import { requirePermission } from "@/middlewares/require-premission.middleware.js";

// src/modules/user/user.routes.ts
export const UserRouter: Router = Router();

/**
 * User Routes
 *
 * All routes are protected by the RBAC middleware.
 * Permissions use the pattern: "resource.action"
 * Example: "user.read", "user.write"
 */

// Create a new user
UserRouter.post(
  "/",
  requirePermission("user", "write"),
  UserController.createUserHandler
);

// List all users
UserRouter.get(
  "/",
  requirePermission("user", "read"),
  UserController.listUsersHandler
);

// Get a single user by ID
UserRouter.get(
  "/:id",
  requirePermission("user", "read"),
  UserController.findUserByIdHandler
);

export default UserRouter;
