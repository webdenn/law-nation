import { prisma } from "@/db/db.js";
import type { AuthRequest } from "@/types/auth-request.js";
import { ForbiddenError, UnauthorizedError } from "@/utils/http-errors.util.js";
import type { Response, NextFunction } from "express";

// /src/middlewares/require-premission.middleware.ts

/**
 * requirePermission(resource, action)
 * - Accepts resource (e.g. "AuditLog") and action ("read")
 * - Normalizes to permissionKey: "auditlog.read"
 * - Loads user's roles -> gathers all role permissions, then checks
 *
 * NOTE: this does a DB hit per request. Consider caching by roleId set.
 */
export function requirePermission(resource: string, action: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new UnauthorizedError("User not authenticated");

      const permissionKey = `${resource.toLowerCase()}.${action.toLowerCase()}`;

      // Get all roles assigned to user and their permissions
      const userRoles = await prisma.userRole.findMany({
        where: { userId: req.user.id },
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      });

      // If user has no roles -> forbidden
      if (!userRoles || userRoles.length === 0) {
        throw new ForbiddenError("User has no roles assigned");
      }

      const permissionSet = new Set<string>();
      for (const ur of userRoles) {
        const rolePerms = ur.role.permissions ?? [];
        for (const rp of rolePerms) {
          if (rp?.permission?.key) permissionSet.add(rp.permission.key);
        }
      }

      // attach permissions set to req for downstream use
      req.permissions = permissionSet;

      // exact key match OR wildcard like "auditlog.*"
      const allowed =
        permissionSet.has(permissionKey) ||
        Array.from(permissionSet).some(
          (k) => k.endsWith(".*") && permissionKey.startsWith(k.slice(0, -2))
        );

      if (!allowed) {
        throw new ForbiddenError(`Missing permission: ${permissionKey}`);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
