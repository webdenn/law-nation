import { Router } from 'express';
import { AboutController } from './controllers/about.controller.js';

const router = Router();

/**
 * @route   GET /api/about
 * @desc    Get about us content for public display
 * @access  Public
 */
router.get(
  '/',
  AboutController.getAboutContent
);

export default router;