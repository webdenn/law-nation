import type { Request, Response } from 'express';
import { AdminPdfService } from '../services/admin-pdf.service.js';
import type { AuthRequest } from '../../../types/auth-request.js';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../../../utils/http-errors.util.js';

const adminPdfService = new AdminPdfService();

export class AdminPdfController {
  /**
   * Upload new admin PDF
   * POST /api/admin/pdfs
   */
  static async uploadPdf(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { title, shortDescription, issue, volume } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new UnauthorizedError('Authentication required');
      }

      if (!req.fileMeta) {
        throw new BadRequestError('PDF file is required');
      }

      const fileInfo = {
        originalPdfUrl: req.fileMeta.url,
        watermarkedPdfUrl: req.fileMeta.watermarkedUrl || req.fileMeta.url,
        fileSize: req.fileMeta.fileSize || 0
      };

      const adminPdf = await adminPdfService.createAdminPdf(
        { title, shortDescription, issue, volume },
        fileInfo,
        userId
      );

      res.status(201).json({
        success: true,
        message: 'Admin PDF uploaded successfully',
        data: adminPdf
      });
    } catch (error) {
      console.error('❌ [AdminPdfController] Upload failed:', error);
      
      if (error instanceof BadRequestError || error instanceof UnauthorizedError) {
        res.status(error.status).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to upload admin PDF'
        });
      }
    }
  }

  /**
   * Get all admin PDFs with pagination and filtering
   * GET /api/admin/pdfs
   */
  static async getAllPdfs(req: Request, res: Response): Promise<void> {
    try {
      const queryParams = req.query as any;
      const result = await adminPdfService.getAdminPdfs(queryParams);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('❌ [AdminPdfController] Get all PDFs failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve admin PDFs'
      });
    }
  }

  /**
   * Get single admin PDF by ID
   * GET /api/admin/pdfs/:id
   */
  static async getPdfById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const adminPdf = await adminPdfService.getAdminPdfById(id);

      if (!adminPdf) {
        res.status(404).json({
          success: false,
          error: 'Admin PDF not found'
        });
        return;
      }

      res.json({
        success: true,
        data: adminPdf
      });
    } catch (error) {
      console.error('❌ [AdminPdfController] Get PDF by ID failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve admin PDF'
      });
    }
  }

  /**
   * Update admin PDF metadata
   * PUT /api/admin/pdfs/:id
   */
  static async updatePdf(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const updateData = req.body;

      const adminPdf = await adminPdfService.updateAdminPdf(id, updateData);

      if (!adminPdf) {
        res.status(404).json({
          success: false,
          error: 'Admin PDF not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Admin PDF updated successfully',
        data: adminPdf
      });
    } catch (error) {
      console.error('❌ [AdminPdfController] Update PDF failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update admin PDF'
      });
    }
  }

  /**
   * Delete admin PDF
   * DELETE /api/admin/pdfs/:id
   */
  static async deletePdf(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const deleted = await adminPdfService.deleteAdminPdf(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Admin PDF not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Admin PDF deleted successfully'
      });
    } catch (error) {
      console.error('❌ [AdminPdfController] Delete PDF failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete admin PDF'
      });
    }
  }

  /**
   * Get admin PDF statistics
   * GET /api/admin/pdfs/stats
   */
  static async getPdfStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await adminPdfService.getAdminPdfStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('❌ [AdminPdfController] Get PDF stats failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve admin PDF statistics'
      });
    }
  }

  /**
   * Get visible admin PDFs for user side
   * GET /api/admin/pdfs/public
   */
  static async getVisiblePdfs(req: Request, res: Response): Promise<void> {
    try {
      const queryParams = req.query as any;
      const result = await adminPdfService.getVisibleAdminPdfs(queryParams);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('❌ [AdminPdfController] Get visible PDFs failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve visible admin PDFs'
      });
    }
  }

  /**
   * Toggle admin PDF visibility
   * PATCH /api/admin/pdfs/:id/visibility
   */
  static async toggleVisibility(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const { isVisible } = req.body;

      if (typeof isVisible !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'isVisible must be a boolean value'
        });
        return;
      }

      const adminPdf = await adminPdfService.updateAdminPdf(id, { isVisible });

      if (!adminPdf) {
        res.status(404).json({
          success: false,
          error: 'Admin PDF not found'
        });
        return;
      }

      res.json({
        success: true,
        message: `Admin PDF ${isVisible ? 'shown' : 'hidden'} successfully`,
        data: adminPdf
      });
    } catch (error) {
      console.error('❌ [AdminPdfController] Toggle visibility failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle admin PDF visibility'
      });
    }
  }
}