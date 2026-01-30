import type { Request, Response } from 'express';
import { AboutService } from '../services/about.service.js';

const aboutService = new AboutService();

export class AboutController {
  /**
   * Get about us content for public display
   * GET /api/about
   */
  static async getAboutContent(req: Request, res: Response): Promise<void> {
    try {
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
      console.error('❌ [AboutController] Get about content failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve about content'
      });
    }
  }
}