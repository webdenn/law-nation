import { Router } from "express";
import { requireAuth, optionalAuth } from "@/middlewares/auth.middleware.js";
import { requirePermission } from "@/middlewares/require-premission.middleware.js";
import { uploadDocument, uploadPdfOnly, uploadOptionalPdf, uploadImage, uploadMultipleImages, uploadArticleFiles, uploadEditorFiles } from "@/middlewares/upload.middleware.js";
import { articleController } from "./article.controller.js";

const router = Router();

// Public/Optional Auth routes - Works for both guest and logged-in users
router.post(
  "/submit",
  optionalAuth, // Check auth but don't require it
  uploadDocument, // Accept PDF or Word from users
  articleController.submitArticle.bind(articleController)
);

// Alternative: Submit with PDF + images together
router.post(
  "/submit-with-images",
  optionalAuth,
  uploadArticleFiles, // Handles PDF + thumbnail + multiple images
  articleController.submitArticle.bind(articleController)
);

// PUBLIC: Verify email and create article (legacy link-based)
router.get(
  "/verify/:token",
  articleController.verifyArticleSubmission.bind(articleController)
);

// PUBLIC: Verify article by code (new code-based)
router.post(
  "/verify-code",
  articleController.verifyArticleByCode.bind(articleController)
);

// PUBLIC: Resend verification code
router.post(
  "/resend-code",
  articleController.resendVerificationCode.bind(articleController)
);

// PUBLIC: Get ONLY published articles (Updated Fix)
router.get(
  "/published",
  articleController.getPublishedArticles.bind(articleController)
);

// PUBLIC: Search articles (no auth required) - Must come before dynamic routes
router.get(
  "/search",
  articleController.searchArticles.bind(articleController)
);

// PUBLIC: Get article preview (no auth required)
router.get(
  "/:id/preview",
  articleController.getArticlePreview.bind(articleController)
);

// PROTECTED: Get article upload history (auth required) - LEGACY
router.get(
  "/:id/history",
  requireAuth,
  requirePermission("article", "read"),
  articleController.getArticleHistory.bind(articleController)
);

// ✅ NEW: Get article change history (with diff tracking)
router.get(
  "/:id/change-history",
  requireAuth,
  articleController.getArticleChangeHistory.bind(articleController)
);

// ✅ NEW: Get specific change log diff
router.get(
  "/:id/change-log/:changeLogId",
  requireAuth,
  articleController.getChangeLogDiff.bind(articleController)
);

// ✅ NEW: Download diff as PDF
router.get(
  "/:id/change-log/:changeLogId/download-diff",
  requireAuth,
  articleController.downloadDiff.bind(articleController)
);

// ✅ NEW: Download editor's uploaded document
router.get(
  "/change-logs/:changeLogId/editor-document",
  requireAuth,
  articleController.downloadEditorDocument.bind(articleController)
);

// PUBLIC: Get article content for reading (optional auth - works for both logged and non-logged users)
router.get(
  "/:id/content",
  optionalAuth,
  articleController.getArticleContent.bind(articleController)
);

// PUBLIC: Get article by slug (SEO-friendly URL)
router.get(
  "/slug/:slug",
  requireAuth,
  requirePermission("article", "read"),
  articleController.getArticleBySlug.bind(articleController)
);

// PUBLIC: Get article content by slug (with 250-word limit for guests)
router.get(
  "/slug/:slug/content",
  optionalAuth,  // Allows both guests and logged-in users
  articleController.getArticleContentBySlug.bind(articleController)
);

// Protected routes - Require authentication
router.use(requireAuth);

// PROTECTED: Upload thumbnail for article
router.post(
  "/:id/upload-thumbnail",
  uploadImage,
  articleController.uploadThumbnail.bind(articleController)
);

// PROTECTED: Upload multiple images for article
router.post(
  "/:id/upload-images",
  uploadMultipleImages("images", 10),
  articleController.uploadImages.bind(articleController)
);

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
  uploadOptionalPdf,
  articleController.approveArticle.bind(articleController)
);

// ✅ NEW: Editor approves article (submits for publishing)
router.patch(
  "/:id/editor-approve",
  requirePermission("article", "write"),
  articleController.editorApproveArticle.bind(articleController)
);

// ✅ NEW: Admin publishes article (only after editor approval)
router.patch(
  "/:id/admin-publish",
  requirePermission("article", "write"),
  articleController.adminPublishArticle.bind(articleController)
);

// Editor: Upload corrected PDF or Word (Option C)
router.patch(
  "/:id/upload-corrected",
  requirePermission("article", "write"),
  uploadEditorFiles, // Editor can upload corrected article + optional editor document
  articleController.uploadCorrectedPdf.bind(articleController)
);

// List articles with filters
router.get(
  "/",
  requirePermission("article", "read"),
  articleController.listArticles.bind(articleController)
);

// PROTECTED: Download article PDF (auth required - all logged-in users)
router.get(
  "/:id/download/pdf",
  requireAuth,
  articleController.downloadArticlePdf.bind(articleController)
);

// PROTECTED: Download article Word (auth required - all logged-in users)
router.get(
  "/:id/download/word",
  requireAuth,
  articleController.downloadArticleWord.bind(articleController)
);

// LEGACY: Keep old download route for backward compatibility (downloads PDF)
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