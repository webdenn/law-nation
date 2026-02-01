import type { Request } from "express";
/**
 * AuthUser: shape of req.user set by your auth middleware
 * You can extend claims as needed (email, roles cache, etc.)
 */
export interface AuthUser {
    id: string;
    roleIds?: string[];
    roles?: {
        name: string;
    }[];
    [k: string]: any;
}
export interface AuthRequest extends Request {
    user?: AuthUser | undefined;
    permissions?: Set<string>;
}
//# sourceMappingURL=auth-request.d.ts.map