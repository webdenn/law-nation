import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/auth-request.js';
import { verifyRecaptcha } from '@/utils/recaptcha.utils.js';
import { BadRequestError } from '@/utils/http-errors.util.js';

/**
 * Middleware to verify reCAPTCHA token
 * Applies to both authenticated and unauthenticated requests
 */
export async function validateRecaptcha(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract reCAPTCHA token from request body
    const recaptchaToken = req.body.recaptchaToken;

    // Token is required - cannot submit without reCAPTCHA
    if (!recaptchaToken) {
      console.warn('⚠️ [reCAPTCHA] Token missing in request');
      throw new BadRequestError('reCAPTCHA verification required. Please complete the reCAPTCHA challenge.');
    }

    // Get user's IP address
    const userIp = req.ip || req.socket.remoteAddress;

    console.log('🔐 [reCAPTCHA] Validating token for IP:', userIp);

    // Verify token with Google
    const result = await verifyRecaptcha(recaptchaToken, userIp);

    if (!result.success) {
      console.error('❌ [reCAPTCHA] Verification failed:', result.error);
      throw new BadRequestError(
        result.error || 'reCAPTCHA verification failed. Please try again.'
      );
    }

    console.log('✅ [reCAPTCHA] Verification successful');

    // Log score if available (reCAPTCHA v3)
    if (result.score !== undefined) {
      console.log(`📊 [reCAPTCHA] Score: ${result.score}`);
    }

    // Continue to next middleware/controller
    next();
  } catch (error) {
    next(error);
  }
}
