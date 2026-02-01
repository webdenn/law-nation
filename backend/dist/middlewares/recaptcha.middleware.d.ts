import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/auth-request.js';
/**
 * Middleware to verify reCAPTCHA token
 * Applies to both authenticated and unauthenticated requests
 */
export declare function validateRecaptcha(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=recaptcha.middleware.d.ts.map