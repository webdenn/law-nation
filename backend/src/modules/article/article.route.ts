import { Router } from "express";
import { requireAuth } from "@/middlewares/auth.middleware.js";
import { requirePermission } from "@/middlewares/require-premission.middleware.js";
import { uploadPdf } from "@/middlewares/upload.middleware.js";
import { articleController } from "./article.controller.js";

const router = Router();

// Public route - Guest submission (no auth)
router.post(
  "/submit",
  uploadPdf,
  articleController.submitArticle.bind(articleController)
);

// Protected routes - Require authentication
router.use(requireAuth);

// Admin: Assign editor to article
router.patch(
  "/:id/assign-editor",
  requirePermission("article", "write"),
  articleController.assignEditor.bind(articleController)
);

// Editor: Approve article (Option A)
router.patch(
  "/:id/approve",
  requirePermission("article", "write"),
  articleController.approveArticle.bind(articleController)
);

// Editor: Upload corrected PDF (Option C)
router.patch(
  "/:id/upload-corrected",
  requirePermission("article", "write"),
  uploadPdf,
  articleController.uploadCorrectedPdf.bind(articleController)
);

// List articles with filters
router.get(
  "/",
  requirePermission("article", "read"),
  articleController.listArticles.bind(articleController)
);

// PUBLIC: Get article preview (no auth required)
router.get(
  "/:id/preview",
  articleController.getArticlePreview.bind(articleController)
);

// PROTECTED: Download article PDF (auth required)
router.get(
  "/:id/download",
  requireAuth,
  articleController.downloadArticlePdf.bind(articleController)
);

// PROTECTED: Get full article details (auth required)
router.get(
  "/:id",
  requirePermission("article", "read"),
  articleController.getArticleById.bind(articleController)
);

// Delete article
router.delete(
  "/:id",
  requirePermission("article", "delete"),
  articleController.deleteArticle.bind(articleController)
);

export default router;
