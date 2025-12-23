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

// PUBLIC: Get article preview (no auth required)
router.get(
  "/:id/preview",
  articleController.getArticlePreview.bind(articleController)
);

// 3. List Articles (MOVED UP FOR PUBLIC ACCESS)
// Ye route pehle niche tha isliye error aa raha tha. Ab ye Public hai.
router.get(
  "/",
  // requirePermission("article", "read"), // Commented for testing Admin Dashboard
  articleController.listArticles.bind(articleController)
);

// ==================================================
// 🛑 AUTHENTICATION CHECKPOINT
// Is line ke neeche sabhi routes ke liye Login zaroori hai
// ==================================================
router.use(requireAuth);

// ✅ Editor Dashboard ke liye assigned articles fetch karne ka route
router.get(
  "/editor/:editorId",
  requirePermission("article", "read"), // Editor ke paas read permission honi chahiye
  articleController.listArticlesByEditor.bind(articleController) 
);

// ==================================================
// 🔒 PROTECTED ROUTES (Login Required)
// ==================================================

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

// PROTECTED: Download article PDF
router.get(
  "/:id/download",
  // requireAuth is already applied globally above
  articleController.downloadArticlePdf.bind(articleController)
);

// PROTECTED: Get full article details
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