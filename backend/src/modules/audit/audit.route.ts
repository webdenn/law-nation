import { Router } from "express";
import { AuditController } from "./controllers/audit.controller.js";
import { requireAuth } from "@/middlewares/auth.middleware.js";
import { requirePermission } from "@/middlewares/require-premission.middleware.js";

const router = Router();
const auditController = new AuditController();

// All audit routes require authentication and admin permission
router.use(requireAuth);
router.use(requirePermission("admin", "read"));

/**
 * @route GET /api/audit/articles/:articleId/timeline
 * @desc Get complete timeline for a specific article
 * @access Admin only
 */
router.get('/articles/:articleId/timeline', auditController.getArticleTimeline);

/**
 * @route GET /api/audit/users/:userId/history
 * @desc Get user's article submission history
 * @access Admin only
 */
router.get('/users/:userId/history', auditController.getUserHistory);

/**
 * @route GET /api/audit/editors/:editorId/activity
 * @desc Get editor's download/upload activity
 * @access Admin only
 */
router.get('/editors/:editorId/activity', auditController.getEditorActivity);

/**
 * @route GET /api/audit/admins/:adminId/decisions
 * @desc Get admin's assignment and decision history
 * @access Admin only
 */
router.get('/admins/:adminId/decisions', auditController.getAdminDecisions);

/**
 * @route GET /api/audit/events
 * @desc Get all audit events with filtering and pagination
 * @access Admin only
 */
router.get('/events',
  auditController.getAllAuditEvents
);

export default router;