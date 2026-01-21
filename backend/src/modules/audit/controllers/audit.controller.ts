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

      // This would be implemented with proper filtering and pagination
      // For now, returning a placeholder response
      res.status(200).json({
        success: true,
        message: 'Audit events retrieved successfully',
        data: {
          events: [],
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: 0,
            totalPages: 0
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