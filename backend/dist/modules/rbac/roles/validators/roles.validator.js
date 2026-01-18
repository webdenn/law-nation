import { z } from "zod";
// /src/modules/rbac/roles/roles.validator.ts
export const roleCreateSchema = z.object({
    name: z.string().min(2),
    description: z.string().optional(),
});
export const roleUpdateSchema = z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
});
export const assignPermissionSchema = z.object({
    permissionId: z.string(), //.cuid(),
});
export const assignRoleToUserSchema = z.object({
    userId: z.string(), //.cuid(),
    roleId: z.string(), //.cuid(),
});
//# sourceMappingURL=roles.validator.js.map