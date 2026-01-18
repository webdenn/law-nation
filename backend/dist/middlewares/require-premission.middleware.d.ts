import type { AuthRequest } from "@/types/auth-request.js";
import type { Response, NextFunction } from "express";
/**
 * requirePermission(resource, action)
 * - Accepts resource (e.g. "AuditLog") and action ("read")
 * - Normalizes to permissionKey: "auditlog.read"
 * - Loads user's roles -> gathers all role permissions, then checks
 *
 * NOTE: this does a DB hit per request. Consider caching by roleId set.
 */
export declare function requirePermission(resource: string, action: string): (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=require-premission.middleware.d.ts.map