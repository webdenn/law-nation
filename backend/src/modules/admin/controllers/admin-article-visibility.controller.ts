import type { Request, Response } from 'express';
import { AdminArticleVisibilityService } from '../services/admin-article-visibility.service.js';
import type { AuthRequest } from '../../../types/auth-request.js';

export class AdminArticleVisibilityController {
  private visibilityService = new AdminArticleVisibilityService();

  /**
   * Toggle article visibility (hide/show from user side)
   * POST /api/admin/articles/:id/visibility
   */
  toggleVisibility = async (req: AuthRequest, res: Response) => {
    try {
      const articleId = req.params.id as string;
      const { isVisible } = req.body;
      const adminUserId = req.user!.id;

      const result = await this.visibilityService.toggleArticleVisibility(
        articleId,
        isVisible,
        adminUserId
      );

      res.status(200).json(result);
    } catch (error) {
      console.error('Error toggling article visibility:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle article visibility',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get visibility statistics
   * GET /api/admin/articles/visibility/stats
   */
  getVisibilityStats = async (req: Request, res: Response) => {
    try {
      const stats = await this.visibilityService.getVisibilityStats();
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting visibility stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get visibility statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get list of hidden articles
   * GET /api/admin/articles/hidden
   */
  getHiddenArticles = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.visibilityService.getHiddenArticles(page, limit);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting hidden articles:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get hidden articles',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}