import { Router } from "express";
import { requireAuth, optionalAuth } from "@/middlewares/auth.middleware.js";
import { requirePermission } from "@/middlewares/require-premission.middleware.js";
import { validateRecaptcha } from "@/middlewares/recaptcha.middleware.js";
import { uploadDocument, uploadPdfOnly, uploadOptionalPdf, uploadImage, uploadMultipleImages, uploadArticleFiles, uploadEditorFiles, uploadDocxOnly } from "@/middlewares/upload.middleware.js";
import { articleController } from "./article.controller.js";

const router = Router();

// Public/Optional Auth routes - Works for both guest and logged-in users
router.post(
  "/submit",
  optionalAuth, // Check auth but don't require it
  uploadDocument, // Accept PDF or Word from users
  validateRecaptcha, // NEW: Verify reCAPTCHA (REQUIRED - blocks bots)
  articleController.submitArticle.bind(articleController)
);

// Alternative: Submit with PDF + images together
router.post(
  "/submit-with-images",
  optionalAuth,
  uploadArticleFiles, // Handles PDF + thumbnail + multiple images
  validateRecaptcha, // NEW: Verify reCAPTCHA (REQUIRED - blocks bots)
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

// NEW: Get article change history (with diff tracking)
router.get(
  "/:id/change-history",
  requireAuth,
  articleController.getArticleChangeHistory.bind(articleController)
);

// NEW: Get editor assignment history (Admin only)
router.get(
  "/:id/editor-history",
  requireAuth,
  requirePermission("article", "read"),
  articleController.getEditorAssignmentHistory.bind(articleController)
);

// NEW: Get specific change log diff
router.get(
  "/:id/change-log/:changeLogId",
  requireAuth,
  articleController.getChangeLogDiff.bind(articleController)
);

// NEW: View visual diff (inline PDF viewer)
router.get(
  "/:id/change-log/:changeLogId/visual-diff",
  requireAuth,
  articleController.viewVisualDiff.bind(articleController)
);

// NEW: Download diff as PDF
router.get(
  "/:id/change-log/:changeLogId/download-diff",
  requireAuth,
  articleController.downloadDiff.bind(articleController)
);

// NEW: Download editor's uploaded document
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

// NEW: Editor approves article (submits for publishing)
router.patch(
  "/:id/editor-approve",
  requirePermission("article", "write"),
  articleController.editorApproveArticle.bind(articleController)
);

// NEW: Admin publishes article (only after editor approval)
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

// NEW: Editor upload edited DOCX for documents
router.patch(
  "/:id/upload-edited-docx",
  requirePermission("article", "write"),
  uploadDocxOnly, // Accept only DOCX files
  articleController.uploadEditedDocx.bind(articleController)
);

// NEW: Upload document (explicit document workflow) - PDF ONLY for users
router.post(
  "/submit-document",
  optionalAuth,
  uploadDocument, // Accept PDF ONLY (users can't upload DOCX)
  validateRecaptcha,
  (req: any, res: any, next: any) => {
    // Force document classification - users can only upload PDF
    req.body.contentType = 'DOCUMENT';
    req.body.documentType = 'PDF'; // Always PDF for user uploads
    next();
  },
  articleController.submitArticle.bind(articleController)
);

// NEW: Admin extract text from document (for publishing)
router.patch(
  "/:id/extract-text",
  requirePermission("article", "write"),
  articleController.extractDocumentText.bind(articleController)
);

// NEW: Admin assigns reviewer (after editor approval)
router.patch(
  "/:id/assign-reviewer",
  requirePermission("article", "write"),
  articleController.assignReviewer.bind(articleController)
);

// NEW: Reviewer uploads corrected document (DOCX only)
router.patch(
  "/:id/reviewer-upload",
  requirePermission("article", "write"),
  uploadDocxOnly, // Reviewers can only upload DOCX files
  articleController.reviewerUploadCorrectedDocument.bind(articleController)
);

// NEW: Reviewer approves article (sends to admin for publishing)
router.patch(
  "/:id/reviewer-approve",
  requirePermission("article", "write"),
  articleController.reviewerApproveArticle.bind(articleController)
);

// NEW: Reviewer downloads editor's document
router.get(
  "/:id/download/editor-document-for-reviewer",
  requireAuth,
  requirePermission("article", "read"),
  articleController.reviewerDownloadEditorDocument.bind(articleController)
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

// NEW: Download original user PDF converted to DOCX (for editors/admins)
router.get(
  "/:id/download/original-docx",
  requireAuth,
  requirePermission("article", "read"),
  articleController.downloadOriginalDocx.bind(articleController)
);

// NEW: Download editor's uploaded DOCX (explicit route for admins)
router.get(
  "/:id/download/editor-docx",
  requireAuth,
  requirePermission("article", "read"),
  articleController.downloadEditorDocx.bind(articleController)
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