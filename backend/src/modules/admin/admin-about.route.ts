import { Router } from 'express';
import { AdminAboutController } from './controllers/admin-about.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/require-premission.middleware.js';
import { validateRequest } from './middlewares/validation.middleware.js';
import { adminAboutUpdateSchema, aboutPreviewSchema } from '../about/validators/about.validator.js';

const router = Router();

// Apply authentication to all admin about routes
router.use(requireAuth);

// Apply admin permission requirement to all routes
router.use(requirePermission('admin', 'write'));

/**
 * @route   GET /api/admin/about
 * @desc    Get about us content for admin editing
 * @access  Admin only
 */
router.get(
  '/',
  AdminAboutController.getAboutContent
);

/**
 * @route   PUT /api/admin/about
 * @desc    Update about us content
 * @access  Admin only
 */
router.put(
  '/',
  validateRequest(adminAboutUpdateSchema),
  AdminAboutController.updateAboutContent
);

/**
 * @route   POST /api/admin/about/preview
 * @desc    Preview about us content without saving
 * @access  Admin only
 */
router.post(
  '/preview',
  validateRequest(aboutPreviewSchema),
  AdminAboutController.previewAboutContent
);

export default router;