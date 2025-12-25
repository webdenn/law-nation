import { Router } from "express";
import { requireAuth, optionalAuth } from "@/middlewares/auth.middleware.js";
import { requirePermission } from "@/middlewares/require-premission.middleware.js";
import { uploadPdf } from "@/middlewares/upload.middleware.js";
import { articleController } from "./article.controller.js";

const router = Router();

// Public/Optional Auth routes - Works for both guest and logged-in users
router.post(
  "/submit",
  optionalAuth, // Check auth but don't require it
  uploadPdf,
  articleController.submitArticle.bind(articleController)
);

// PUBLIC: Verify email and create article
router.get(
  "/verify/:token",
  articleController.verifyArticleSubmission.bind(articleController)
);

// PUBLIC: Search articles (no auth required) - Must come before dynamic routes
router.get(
  "/search",
  articleController.searchArticles.bind(articleController)
);

// PUBLIC: List published articles (no auth required) - For home page
router.get(
  "/published",
  articleController.listPublishedArticles.bind(articleController)
);

// PUBLIC: Get article content for reading (no auth required)
router.get(
  "/:id/content",
  articleController.getArticleContent.bind(articleController)
);

// PUBLIC: Get article preview (no auth required)
router.get(
  "/:id/preview",
  articleController.getArticlePreview.bind(articleController)
);

// PROTECTED: Get article upload history (auth required)
router.get(
  "/:id/history",
  requireAuth,
  requirePermission("article", "read"),
  articleController.getArticleHistory.bind(articleController)
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
