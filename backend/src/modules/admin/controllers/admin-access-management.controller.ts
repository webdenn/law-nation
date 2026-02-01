import type { Response } from "express";
import type { AuthRequest } from "@/types/auth-request.js";
import { AdminAccessManagementService } from "../services/admin-access-management.service.js";
import { InternalServerError, BadRequestError } from "@/utils/http-errors.util.js";

export class AdminAccessManagementController {
  private accessManagementService: AdminAccessManagementService;

  constructor() {
    this.accessManagementService = new AdminAccessManagementService();
  }

  /**
   * Get all editors for access management
   */
  async getEditorsList(req: AuthRequest, res: Response): Promise<void> {
    try {
      console.log(`📋 [Access Management Controller] Getting editors list`);
      
      const { status = 'ALL', page = 1, limit = 10, search } = req.query as {
        status?: 'ACTIVE' | 'INACTIVE' | 'ALL';
        page?: number;
        limit?: number;
        search?: string;
      };

      const result = await this.accessManagementService.getAllEditorsForAccessManagement(
        status,
        Number(page),
        Number(limit),
        search
      );

      res.status(200).json({
        success: true,
        message: 'Editors list retrieved successfully',
        data: result
      });

    } catch (error: any) {
      console.error(`❌ [Access Management Controller] Failed to get editors list:`, error);
      throw new InternalServerError('Failed to retrieve editors list');
    }
  }

  /**
   * Get all reviewers for access management
   */
  async getReviewersList(req: AuthRequest, res: Response): Promise<void> {
    try {
      console.log(`📋 [Access Management Controller] Getting reviewers list`);
      
      const { status = 'ALL', page = 1, limit = 10, search } = req.query as {
        status?: 'ACTIVE' | 'INACTIVE' | 'ALL';
        page?: number;
        limit?: number;
        search?: string;
      };

      const result = await this.accessManagementService.getAllReviewersForAccessManagement(
        status,
        Number(page),
        Number(limit),
        search
      );

      res.status(200).json({
        success: true,
        message: 'Reviewers list retrieved successfully',
        data: result
      });

    } catch (error: any) {
      console.error(`❌ [Access Management Controller] Failed to get reviewers list:`, error);
      throw new InternalServerError('Failed to retrieve reviewers list');
    }
  }

  /**
   * Remove access for editor or reviewer
   */
  async removeUserAccess(req: AuthRequest, res: Response): Promise<void> {
    try {
      console.log(`🚫 [Access Management Controller] Removing user access`);
      
      if (!req.user?.id) {
        throw new Error('Admin user not found in request');
      }

      const { userId, userType, reason } = req.body;

      const result = await this.accessManagementService.removeUserAccess(
        { userId, userType, reason },
        req.user.id
      );

      res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });

    } catch (error: any) {
      console.error(`❌ [Access Management Controller] Failed to remove user access:`, error);
      throw new InternalServerError(`Failed to remove user access: ${error.message}`);
    }
  }

  /**
   * Get access management statistics
   */
  async getAccessManagementStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      console.log(`📊 [Access Management Controller] Getting access management statistics`);
      
      const stats = await this.accessManagementService.getAccessManagementStats();

      res.status(200).json({
        success: true,
        message: 'Access management statistics retrieved successfully',
        data: stats
      });

    } catch (error: any) {
      console.error(`❌ [Access Management Controller] Failed to get statistics:`, error);
      throw new InternalServerError('Failed to retrieve access management statistics');
    }
  }

  /**
   * Get user access history
   */
  async getUserAccessHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      console.log(`📋 [Access Management Controller] Getting user access history`);
      
      const { userId } = req.params;

      if (!userId || Array.isArray(userId)) {
        throw new BadRequestError('Valid User ID is required');
      }

      const history = await this.accessManagementService.getUserAccessHistory(userId);

      res.status(200).json({
        success: true,
        message: 'User access history retrieved successfully',
        data: history
      });

    } catch (error: any) {
      console.error(`❌ [Access Management Controller] Failed to get user access history:`, error);
      throw new InternalServerError('Failed to retrieve user access history');
    }
  }
}