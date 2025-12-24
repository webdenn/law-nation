import type { NextFunction, Response } from "express";
import { prisma } from "@/db/db.js";
import type { AuthRequest } from "@/types/auth-request.js";
import { UnauthorizedError } from "@/utils/http-errors.util.js";
import { verifyAccessToken } from "@/utils/jwt.utils.js";

// /src/middlewares/auth.middleware.ts
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer "))
    throw new UnauthorizedError("Missing token");

  const token = auth.split(" ")[1];
  if (!token) throw new UnauthorizedError("Missing token");

  let payload: { sub: string };
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }

  // Fetch user, roles, and permissions properly
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    },
  });

  if (!user) throw new UnauthorizedError("User not found");

  // Flatten permissions from all roles
  const permissionSet = new Set<string>();
  for (const userRole of user.roles) {
    for (const rolePerm of userRole.role.permissions) {
      permissionSet.add(rolePerm.permission.key);
    }
  }

  // Attach to request
  req.user = {
    id: user.id,
    roleIds: user.roles.map((r) => r.roleId),
    roles: user.roles.map((r) => ({ name: r.role.name })),
  };

  req.permissions = permissionSet;

  return next();
}

/**
 * Optional Authentication Middleware
 * Checks for auth token but doesn't fail if missing
 * Used for endpoints that work for both guest and logged-in users
 */
export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const auth = req.headers.authorization;
  
  // No token provided - continue as guest
  if (!auth || !auth.startsWith("Bearer ")) {
    delete req.user;
    req.permissions = new Set<string>();
    return next();
  }

  const token = auth.split(" ")[1];
  
  // Empty token - continue as guest
  if (!token) {
    delete req.user;
    req.permissions = new Set<string>();
    return next();
  }

  try {
    // Try to verify token
    const payload = verifyAccessToken(token);
    
    // Fetch user with roles and permissions
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (user) {
      // Flatten permissions from all roles
      const permissionSet = new Set<string>();
      for (const userRole of user.roles) {
        for (const rolePerm of userRole.role.permissions) {
          permissionSet.add(rolePerm.permission.key);
        }
      }

      // Attach user to request
      req.user = {
        id: user.id,
        roleIds: user.roles.map((r) => r.roleId),
        roles: user.roles.map((r) => ({ name: r.role.name })),
      };
      req.permissions = permissionSet;
    } else {
      // User not found - continue as guest
      delete req.user;
      req.permissions = new Set<string>();
    }
  } catch (error) {
    // Token invalid or expired - continue as guest
    delete req.user;
    req.permissions = new Set<string>();
  }

  return next();
}
