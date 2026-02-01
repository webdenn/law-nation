import { Router } from "express";
import { requireAuth } from "@/middlewares/auth.middleware.js";
import { requirePermission } from "@/middlewares/require-premission.middleware.js";
import { AdminArticleVisibilityController } from "./controllers/admin-article-visibility.controller.js";
import { validateRequest } from "./middlewares/validation.middleware.js";
import { toggleVisibilitySchema, getHiddenArticlesSchema } from "./validators/admin-article-visibility.validator.js";

const router = Router();
const visibilityController = new AdminArticleVisibilityController();

// Use authentication and admin permission for all routes
router.use(requireAuth);
router.use(requirePermission("admin", "read"));

// PATCH /api/admin/articles/:id/visibility
router.patch(
    "/:id/visibility",

    validateRequest(toggleVisibilitySchema),
    visibilityController.toggleVisibility
);

// GET /api/admin/articles/visibility/stats
router.get(
    "/visibility/stats",
    visibilityController.getVisibilityStats
);

// GET /api/admin/articles/hidden
router.get(
    "/hidden",
    validateRequest(getHiddenArticlesSchema),
    visibilityController.getHiddenArticles
);

export default router;
