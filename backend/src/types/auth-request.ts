import type { Request } from "express";

// /src/types/auth-request.ts

/**
 * AuthUser: shape of req.user set by your auth middleware
 * You can extend claims as needed (email, roles cache, etc.)
 */
export interface AuthUser {
  id: string;
  // optional convenience: cached role ids or names (if your auth populates it)
  roleIds?: string[];
  roles?: { name: string }[];
  [k: string]: any;
}

export interface AuthRequest extends Request {
  user?: AuthUser | undefined;
  // optionally attach permission set for downstream handlers
  permissions?: Set<string>;
}
