import type { NextFunction, Response } from "express";
import type { AuthRequest } from "@/types/auth-request.js";
export declare function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Optional Authentication Middleware
 * Checks for auth token but doesn't fail if missing
 * Used for endpoints that work for both guest and logged-in users
 */
export declare function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=auth.middleware.d.ts.map