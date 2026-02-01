import { Router } from 'express';
import { AdminPdfController } from './controllers/admin-pdf.controller.js';
import { uploadAdminPdf } from '../../middlewares/upload.middleware.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/require-premission.middleware.js';
import { validateRequest } from './middlewares/validation.middleware.js';
import {
  adminPdfUploadSchema,
  adminPdfUpdateSchema,
  adminPdfQuerySchema,
  adminPdfIdSchema
} from './validators/admin-pdf.validator.js';

const router = Router();

// Apply authentication to all admin PDF routes
router.use(requireAuth);

// Apply base admin permission
router.use(requirePermission('admin', 'read'));

/**
 * @route   GET /api/admin/pdfs/stats
 * @desc    Get admin PDF statistics
 * @access  Admin only
 */
router.get(
  '/stats',
  AdminPdfController.getPdfStats
);

/**
 * @route   GET /api/admin/pdfs/public
 * @desc    Get visible admin PDFs for user side
 * @access  Admin only (for preview)
 */
router.get(
  '/public',
  validateRequest(adminPdfQuerySchema),
  AdminPdfController.getVisiblePdfs
);

/**
 * @route   POST /api/admin/pdfs
 * @desc    Upload new admin PDF
 * @access  Admin only (write)
 */
router.post(
  '/',
  requirePermission('admin', 'write'),
  uploadAdminPdf, // Handle file upload with unlimited size
  validateRequest(adminPdfUploadSchema),
  AdminPdfController.uploadPdf
);

/**
 * @route   GET /api/admin/pdfs
 * @desc    Get all admin PDFs with pagination and filtering
 * @access  Admin only
 */
router.get(
  '/',
  validateRequest(adminPdfQuerySchema),
  AdminPdfController.getAllPdfs
);

/**
 * @route   GET /api/admin/pdfs/:id
 * @desc    Get single admin PDF by ID
 * @access  Admin only
 */
router.get(
  '/:id',
  validateRequest(adminPdfIdSchema),
  AdminPdfController.getPdfById
);

/**
 * @route   PUT /api/admin/pdfs/:id
 * @desc    Update admin PDF metadata
 * @access  Admin only (write)
 */
router.put(
  '/:id',
  requirePermission('admin', 'write'),
  validateRequest(adminPdfIdSchema),
  validateRequest(adminPdfUpdateSchema),
  AdminPdfController.updatePdf
);

/**
 * @route   PATCH /api/admin/pdfs/:id/visibility
 * @desc    Toggle admin PDF visibility
 * @access  Admin only (write)
 */
router.patch(
  '/:id/visibility',
  requirePermission('admin', 'write'),
  validateRequest(adminPdfIdSchema),
  AdminPdfController.toggleVisibility
);

/**
 * @route   DELETE /api/admin/pdfs/:id
 * @desc    Delete admin PDF
 * @access  Admin only (write)
 */
router.delete(
  '/:id',
  requirePermission('admin', 'write'),
  validateRequest(adminPdfIdSchema),
  AdminPdfController.deletePdf
);

export default router;