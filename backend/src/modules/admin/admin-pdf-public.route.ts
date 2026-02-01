import { Router } from 'express';
import { AdminPdfController } from './controllers/admin-pdf.controller.js';
import { validateRequest } from './middlewares/validation.middleware.js';
import { adminPdfQuerySchema, adminPdfIdSchema } from './validators/admin-pdf.validator.js';

const router = Router();

/**
 * @route   GET /api/public/admin-pdfs
 * @desc    Get visible admin PDFs for public access
 * @access  Public
 */
router.get(
  '/',
  validateRequest(adminPdfQuerySchema),
  AdminPdfController.getVisiblePdfs
);

/**
 * @route   GET /api/public/admin-pdfs/:id
 * @desc    Get single visible admin PDF by ID for public access
 * @access  Public
 */
router.get(
  '/:id',
  validateRequest(adminPdfIdSchema),
  async (req, res) => {
    try {
      const id = req.params.id as string;
      
      // Import service directly to check visibility
      const { AdminPdfService } = await import('./services/admin-pdf.service.js');
      const adminPdfService = new AdminPdfService();
      
      const adminPdf = await adminPdfService.getAdminPdfById(id);

      if (!adminPdf || !adminPdf.isVisible) {
        res.status(404).json({
          success: false,
          error: 'Admin PDF not found or not visible'
        });
        return;
      }

      // Return only watermarked URL for public access
      const publicPdf = {
        ...adminPdf,
        originalPdfUrl: undefined, // Hide original URL from public
        pdfUrl: adminPdf.watermarkedPdfUrl // Use watermarked version
      };

      res.json({
        success: true,
        data: publicPdf
      });
    } catch (error) {
      console.error('❌ [PublicAdminPdf] Get PDF by ID failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve admin PDF'
      });
    }
  }
);

export default router;