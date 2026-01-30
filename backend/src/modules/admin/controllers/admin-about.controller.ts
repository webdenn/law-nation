import type { Request, Response } from 'express';
import { AboutService } from '../../about/services/about.service.js';
import type { AuthRequest } from '../../../types/auth-request.js';
import { UnauthorizedError } from '../../../utils/http-errors.util.js';

const aboutService = new AboutService();

export class AdminAboutController {
  /**
   * Get about us content for admin editing
   * GET /api/admin/about
   */
  static async getAboutContent(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        throw new UnauthorizedError('Authentication required');
      }

      let aboutContent = await aboutService.getAboutContent();

      // If no content exists, create default content
      if (!aboutContent) {
        aboutContent = await aboutService.createDefaultContent();
      }

      res.json({
        success: true,
        data: aboutContent
      });
    } catch (error) {
      console.error('❌ [AdminAboutController] Get about content failed:', error);
      
      if (error instanceof UnauthorizedError) {
        res.status(error.status).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve about content'
        });
      }
    }
  }

  /**
   * Update about us content
   * PUT /api/admin/about
   */
  static async updateAboutContent(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        throw new UnauthorizedError('Authentication required');
      }

      const { content } = req.body;

      const updatedContent = await aboutService.updateAboutContent({ content });

      res.json({
        success: true,
        message: 'About content updated successfully',
        data: updatedContent
      });
    } catch (error) {
      console.error('❌ [AdminAboutController] Update about content failed:', error);
      
      if (error instanceof UnauthorizedError) {
        res.status(error.status).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to update about content'
        });
      }
    }
  }

  /**
   * Preview about us content (without saving)
   * POST /api/admin/about/preview
   */
  static async previewAboutContent(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        throw new UnauthorizedError('Authentication required');
      }

      const { content } = req.body;

      const previewData = await aboutService.previewContent(content);

      res.json({
        success: true,
        message: 'Content preview generated',
        data: previewData
      });
    } catch (error) {
      console.error('❌ [AdminAboutController] Preview about content failed:', error);
      
      if (error instanceof UnauthorizedError) {
        res.status(error.status).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to generate content preview'
        });
      }
    }
  }
}