import type { Request, Response } from "express";
import { AuditService } from "../services/audit.service.js";
import { NotFoundError, BadRequestError } from "@/utils/http-errors.util.js";

export class AuditController {
  private auditService: AuditService;

  constructor() {
    this.auditService = new AuditService();
  }

  /**
   * Get article timeline
   * GET /api/audit/articles/:articleId/timeline
   */
  getArticleTimeline = async (req: Request, res: Response): Promise<void> => {
    try {
      const { articleId } = req.params;

      if (!articleId || Array.isArray(articleId)) {
        res.status(400).json({
          success: false,
          message: 'Valid Article ID is required'
        });
        return;
      }

      console.log(`📋 [Audit Controller] Getting timeline for article: ${articleId}`);

      const timeline = await this.auditService.getArticleTimeline(articleId);

      res.status(200).json({
        success: true,
        message: 'Article timeline retrieved successfully',
        data: timeline
      });

    } catch (error: any) {
      console.error(`❌ [Audit Controller] Failed to get article timeline:`, error);

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve article timeline'
      });
    }
  };

  /**
   * Get user submission history
   * GET /api/audit/users/:userId/history
   */
  getUserHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!userId || Array.isArray(userId)) {
        res.status(400).json({
          success: false,
          message: 'Valid User ID is required'
        });
        return;
      }

      console.log(`📋 [Audit Controller] Getting history for user: ${userId}`);

      const history = await this.auditService.getUserHistory(userId);

      res.status(200).json({
        success: true,
        message: 'User history retrieved successfully',
        data: history
      });

    } catch (error: any) {
      console.error(`❌ [Audit Controller] Failed to get user history:`, error);

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user history'
      });
    }
  };

  /**
   * Get editor activity
   * GET /api/audit/editors/:editorId/activity
   */
  getEditorActivity = async (req: Request, res: Response): Promise<void> => {
    try {
      const { editorId } = req.params;

      if (!editorId || Array.isArray(editorId)) {
        res.status(400).json({
          success: false,
          message: 'Valid Editor ID is required'
        });
        return;
      }

      console.log(`📋 [Audit Controller] Getting activity for editor: ${editorId}`);

      const activity = await this.auditService.getEditorActivity(editorId);

      res.status(200).json({
        success: true,
        message: 'Editor activity retrieved successfully',
        data: activity
      });

    } catch (error: any) {
      console.error(`❌ [Audit Controller] Failed to get editor activity:`, error);

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve editor activity'
      });
    }
  };

  /**
   * Get reviewer activity
   * GET /api/audit/reviewers/:reviewerId/activity
   */
  getReviewerActivity = async (req: Request, res: Response): Promise<void> => {
    try {
      const { reviewerId } = req.params;

      if (!reviewerId || Array.isArray(reviewerId)) {
        res.status(400).json({
          success: false,
          message: 'Valid Reviewer ID is required'
        });
        return;
      }

      console.log(`📋 [Audit Controller] Getting activity for reviewer: ${reviewerId}`);

      const activity = await this.auditService.getReviewerActivity(reviewerId);

      res.status(200).json({
        success: true,
        message: 'Reviewer activity retrieved successfully',
        data: activity
      });

    } catch (error: any) {
      console.error(`❌ [Audit Controller] Failed to get reviewer activity:`, error);

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve reviewer activity'
      });
    }
  };

  /**
   * Get admin decisions
   * GET /api/audit/admins/:adminId/decisions
   */
  getAdminDecisions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { adminId } = req.params;

      if (!adminId || Array.isArray(adminId)) {
        res.status(400).json({
          success: false,
          message: 'Valid Admin ID is required'
        });
        return;
      }

      console.log(`📋 [Audit Controller] Getting decisions for admin: ${adminId}`);

      const decisions = await this.auditService.getAdminDecisions(adminId);

      res.status(200).json({
        success: true,
        message: 'Admin decisions retrieved successfully',
        data: decisions
      });

    } catch (error: any) {
      console.error(`❌ [Audit Controller] Failed to get admin decisions:`, error);

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve admin decisions'
      });
    }
  };

  /**
   * Get all audit events (admin only)
   * GET /api/audit/events?page=1&limit=50&articleId=xxx&userId=xxx&eventType=xxx
   */
  getAllAuditEvents = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = '1',
        limit = '50',
        articleId,
        userId,
        eventType,
        startDate,
        endDate
      } = req.query;

      console.log(`📋 [Audit Controller] Getting audit events with filters`);

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 50;
      const offset = (pageNum - 1) * limitNum;

      // Build where clause for filtering
      const where: any = {};

      if (articleId && typeof articleId === 'string') {
        where.articleId = articleId;
      }

      if (userId && typeof userId === 'string') {
        where.userId = userId;
      }

      if (eventType && typeof eventType === 'string') {
        where.eventType = eventType;
      }

      if (startDate && typeof startDate === 'string') {
        where.eventDate = {
          ...where.eventDate,
          gte: startDate
        };
      }

      if (endDate && typeof endDate === 'string') {
        where.eventDate = {
          ...where.eventDate,
          lte: endDate
        };
      }

      // Get events with pagination
      const [events, total] = await Promise.all([
        this.auditService.getAllAuditEvents(where, limitNum, offset),
        this.auditService.getAuditEventsCount(where)
      ]);

      const totalPages = Math.ceil(total / limitNum);

      res.status(200).json({
        success: true,
        message: 'Audit events retrieved successfully',
        data: {
          events,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1
          },
          filters: {
            articleId,
            userId,
            eventType,
            startDate,
            endDate
          }
        }
      });

    } catch (error: any) {
      console.error(`❌ [Audit Controller] Failed to get audit events:`, error);

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve audit events'
      });
    }
  };
}