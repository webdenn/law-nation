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

// Invite an editor (sends email with password setup link)
UserRouter.post(
  "/invite-editor",
  requirePermission("user", "write"),
  UserController.inviteEditorHandler
);

// Invite a reviewer (sends email with password setup link)
UserRouter.post(
  "/invite-reviewer",
  requirePermission("user", "write"),
  UserController.inviteReviewerHandler
);

// ✅ 1. Editors List (YE NAYA ROUTE YAHAN ADD KARO)
// Isko hamesha '/:id' se pehle rakhna
UserRouter.get(
  "/editors",
  requirePermission("user", "read"), // Permission same rakhi hai
  UserController.listEditorsHandler
);

// ✅ 2. Reviewers List
// Isko hamesha '/:id' se pehle rakhna
UserRouter.get(
  "/reviewers",
  requirePermission("user", "read"), // Permission same rakhi hai
  UserController.listReviewersHandler
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
